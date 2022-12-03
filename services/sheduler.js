const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const dotenv = require("dotenv");
dotenv.config();
const constants = require("../utils/constants");
const logger = require("../modules/logger.js");
const availabilityTable = require("../models/app.venueAvailability");
const pitchBookings = require("../models/app.pitchBooking");
const pitchBlocking = require("../models/app.pitchBlocking");
const venueTable = require("../models/app.venue");
const timeRange = require("../data/pitch_timeSlots.json");
const AppUser = require("../models/app.user");
const transaction = require("../models/app.transaction");
const Game = require("../models/app.game");
const stripe = require('stripe')(process.env.SECRET_KEY);
const stringTemplateParser = require("../modules/notification");
var notificationTemplate = require("../data/notification.json").en;
const getApi = require("../modules/api");
const apiURL = require("../utils/apis");
var moment = require('moment');


exports.updateAvailability = async () => {
  let date = dayjs().format("YYYY-MM-DD");
  let time = dayjs().format("HH:mm");

  bookings = await pitchBlocking.find({ "booking.date": { $gte: date } })
  let distinctBookings = [...new Map(bookings.map(item =>
    [item['venueId'].toString(), item])).values()]

  distinctBookings.forEach(async (booking) => {
    let bookingDay = dayjs(booking.booking.date);
    let day = parseInt(bookingDay.format("d"));
    let isSameDay = dayjs().format("DD-MM-YYYY") == bookingDay.format("DD-MM-YYYY")

    const venue = await venueTable.findOne({ _id: booking.venueId }).select({
      name: 1,
      grounds: 1,
    })

    venue.grounds.forEach(async (ground) => {

      let smallUnit = ground.pitches.reduce(function (prev, curr) {
        return prev.count < curr.count ? prev.count : curr.count;
      });

      let pitchesWithinUnit = ground.pitches.filter((e) => e.count == smallUnit)
      if (pitchesWithinUnit[0]) {
        let basicAvailabilityOfSlots = pitchesWithinUnit[0].availability.find((e) => e.day == day).availabilityChart
        bookingsWithSmallerunit = bookings.filter((ee) =>
          ee.booking.date == booking.booking.date && ee.groundId.toString() == ground._id.toString() && ee.type == smallUnit)

        bookingsWithSmallerunit = [...new Map(bookingsWithSmallerunit.map(item =>
          [item['pitchId'].toString(), item])).values()]

        let pitchesWithinUnitlength = pitchesWithinUnit.length;

        let finalTimeSlots = basicAvailabilityOfSlots.map((item) => {
          let slot = timeRange.find(e => e.id == item.id)

          let bookingCount = 0
          bookingsWithSmallerunit.forEach((book) => {
            let index = book.booking.timeSlots.findIndex(e => e == item.id);

            if (index != -1) {
              bookingCount = bookingCount + 1
            }
          })
          if (bookingCount >= pitchesWithinUnitlength) {
            let newItem = { timeRange: slot.timeRange, id: item.id, status: item.status }
            newItem.status = 1;
            return newItem;
          } else {
            if ((dayjs(`01/01/2011 ${time}:00`).isAfter(dayjs(`01/01/2011 ${slot.from}:00`))) && isSameDay) {
              let newItem = { timeRange: slot.timeRange, id: item.id, status: item.status }
              newItem.status = 2;
              return newItem;
            } else {
              let newItem = { timeRange: slot.timeRange, id: item.id, status: item.status }
              return newItem;
            }

          }
        })

        let distinctTimeranges = [...new Map(finalTimeSlots.map(item =>
          [item['timeRange'].toString(), item])).values()]

        distinctTimeranges.forEach(async (item) => {
          let timeRangeBasedSlots = finalTimeSlots.filter((ee) => ee.timeRange == item.timeRange)
          let availableitems = timeRangeBasedSlots.filter((x) => x.status == 0)

          if (availableitems.length < 2) {
            await availabilityTable.updateOne(
              { venueId: venue._id, date: booking.booking.date },
              {
                "$push":
                {
                  timeRange: item.timeRange
                }
              },
              { upsert: true }
            )
          }
        })
        
      }
    })
  })

}

// exports.verifyStripeTransaction = async () => {
//   console.log("yessss....")
//   let transactions;
//   transactions = await transaction.find({status:2})
//   transactions.map(async (item) => {
//     console.log("yessss....")
//     console.log(item.paymentIntent)
    
//     const paymentIntent = await stripe.paymentIntents.retrieve(
//       item.paymentId
//     );

//     if (paymentIntent.status != "successs") {
//       console.log("yessss....")
//       let bookingId = item.bookingId;
//       let referenceId = item.referenceId;
//       let booking = await pitchBookings.findById(bookingId);
//       booking.status = 4;
//       blocking = await pitchBlocking.remove({ "booking.referenceId": referenceId });
//       let transactions = await transaction.updateOne({ bookingId: bookingId }, { $set: { status: 4 } })
//       await booking.save();
//     }else{
//       let bookingId = item.bookingId;
//       let booking = await pitchBookings.findById(bookingId);
//       let userId = booking.userId;
//       let referenceId = booking.referenceId;
//       booking.status = 3;
//       await booking.save()
//       item.status = 3;
//       await item.save();
//       const user = await AppUser.findById(
//         userId,
//         "name position pushToken notificationEnabled"
//       );
      
//     const userName = user.name;
//     let userPushTokens = [];
//     if (user.notificationEnabled == true) {
//       console.log(2222);
//       userPushTokens = user.pushToken;
//     }
  
//     notifications.push({
//       title: "Booking Successfull",
//       content: "Your booking is successfull",
//       type: 0,
//       userId: userId,
//       createdAt: Date.now(),
//       createdBy: userId,
//       read: false
//     });

    
//     if (userPushTokens.length) {
//       console.log(1111111);
//       reqMobilePushBody = {
//         pushToken: userPushTokens,
//         title: "11NOW",
//         message: stringTemplateParser(notificationTemplate.booking_created, {
//           userName: userName,
//           referenceId: referenceId
//         }),
//         data: { type: "2", referenceId: referenceId },
//       };
//       await getApi(
//         apiURL.SEND_MOBILE_PUSH,
//         "POST",
//         reqMobilePushBody,
//         "multiple"
//       ); //Mobile Push

//     }

//     }
//   })

// }


exports.verifyStripeTransaction = async () => {
  console.log("yessss....")
  let transactions;
  let paymentIntent;
  transactions = await transaction.find({status:2})
  for (item of transactions){
    console.log("yessss....")
    console.log(item.paymentIntent)
      paymentIntent = await stripe.paymentIntents.retrieve(
      item.paymentId
    );
    console.log("outside try and catch")
    if (paymentIntent.status != "successs") {
      console.log("yessss....")
      let bookingId = item.bookingId;
      let referenceId = item.referenceId;
      let booking = await pitchBookings.findById(bookingId);
      booking.status = 4;
      blocking = await pitchBlocking.remove({ "booking.referenceId": referenceId });
      let transactions = await transaction.updateOne({ bookingId: bookingId }, { $set: { status: 4 } })
      await booking.save();
    }else{
      console.log("nooooo")
      let bookingId = item.bookingId;
      let booking = await pitchBookings.findById(bookingId);
      let userId = booking.userId;
      let referenceId = booking.referenceId;
      booking.status = 3;
      await booking.save()
      item.status = 3;
      await item.save();
      const user = await AppUser.findById(
        userId,
        "name position pushToken notificationEnabled"
      );
      
    const userName = user.name;
    let userPushTokens = [];
    if (user.notificationEnabled == true) {
      console.log(2222);
      userPushTokens = user.pushToken;
    }
  
    notifications.push({
      title: "Booking Successfull",
      content: "Your booking is successfull",
      type: 0,
      userId: userId,
      createdAt: Date.now(),
      createdBy: userId,
      read: false
    });

    
    if (userPushTokens.length) {
      console.log(1111111);
      reqMobilePushBody = {
        pushToken: userPushTokens,
        title: "11NOW",
        message: stringTemplateParser(notificationTemplate.booking_created, {
          userName: userName,
          referenceId: referenceId
        }),
        data: { type: "2", referenceId: referenceId },
      };
      await getApi(
        apiURL.SEND_MOBILE_PUSH,
        "POST",
        reqMobilePushBody,
        "multiple"
      ); //Mobile Push

    }

    }
}
}

exports.bookingNotification = async () => {
  let date = dayjs().format("YYYY-MM-DD");
  console.log(date);
  let time = dayjs().format("HH:mm");
  const endDate = dayjs()
  .add(30, "minutes")
  .format("HH:mm");
  console.log(endDate);
  let booking;
  let userPushTokens = [];
  let notifications = [];
  let userName;

  // let query = {};
  // query["status"] = {$eq:3};
  // query["booking.date"] = { $eq: date };

  booking = await pitchBookings.find({status:3, "booking.date": { $eq: date }, pushSended:{$ne:true}, gameId:{$exists:false} })
  
  booking.map(async (item)=>{
    let userId = item.userId;
    let referenceId = item.referenceId;
    console.log(item.booking[0].timeId[0])
    let startingTime = timeRange.find((e)=> e.id == item.booking[0].timeId[0])
    console.log(startingTime)
    console.log(time)
    if ((dayjs(`01/01/2011 ${endDate}:00`).isAfter(dayjs(`01/01/2011 ${startingTime.from}:00`)))) {
      console.log(33333333);
      const user = await AppUser.findById(
        userId,
        "name position pushToken notificationEnabled"
      );
      
     userName = user.name;
    if (user.notificationEnabled == true) {
      console.log(2222);
      userPushTokens = user.pushToken;
    }
  
    notifications.push({
      title: "Booking Reminder",
      content: "You have booking in an hour",
      type: 0,
      userId: userId,
      createdAt: Date.now(),
      createdBy: userId,
      read: false
    });
    }

    if (userPushTokens.length) {
      console.log(1111111);
      reqMobilePushBody = {
        pushToken: userPushTokens,
        title: "11NOW",
        message: stringTemplateParser(notificationTemplate.booking_remainder, {
          userName: userName,
          referenceId: referenceId
        }),
        data: { type: "2", referenceId: referenceId },
      };
      await getApi(
        apiURL.SEND_MOBILE_PUSH,
        "POST",
        reqMobilePushBody,
        "multiple"
      ); //Mobile Push
  
    }
    item.pushSended = true;
    await item.save();
  })  
}

exports.clearVenueAvailability = async () => {
  let availability;
  let currentDate = new Date();
  let pastDate = new Date(currentDate)
  pastDate.setDate(pastDate.getDate() - 2)
  



  availability = await availabilityTable.find({})
  
  availability.map((item)=>{
    let bookingDate = new Date(item.date);
    console.log(pastDate)
    console.log(bookingDate)

    if(bookingDate<=pastDate){
      item.isCompleted = true;
      item.save();
    }
        
  })

  let clearAvailability = await availabilityTable.remove({completed:true})  
}


exports.verifyBookingStatus = async () => {
  let bookings;
  let currentDate = dayjs()
  bookings = await pitchBookings.find({status:1})
  
  for (booking of bookings){
    let createdAt = booking.createdAt;
    let mins = currentDate.diff(createdAt, "minutes", true)
    if (mins > 7){
      booking.status = 6;
      await booking.save();
    }
  }

}

exports.bookingWithGameNotification = async () => {
  let booking;
  let game;
  let userPushTokens = [];
  let pushTokens = [];
 

  booking = await pitchBookings.find({status:3, gamePushSended:{$ne:true}, gameId:{$exists:true} })
    .populate({
      path:"userId",
      select:"name"
    })  
  console.log(booking)
  for (item of booking){
   let bookingId = item._id;
   let gameId = item.gameId;
   let userBooked = item.userId._id;
   let userName = item.userId.name;
   let timeSlot = timeRange.find((e)=> e.id == item.booking[0].timeId[0])
   let bookingDate = item.booking[0].date
   let formattedDate = moment(bookingDate).format("ddd Do MMM YY");
   let formattedTime = moment(timeSlot.from, ["HH"]).format("hh A");
   game = await Game.findById(gameId)
   .populate({
    path: "gameMembers.userId",
    select: "name pushToken notificationEnabled active isDeleted",
  })

  let gameName = game.gameName;
  let message = `Pitch Booked by ${userName} for ${gameName} game on ${formattedDate} at ${formattedTime} (Venue Time)`;
  let gameMembers = game.gameMembers;
  let createdBy = game.createdBy
  let gameMemberData;
  let type = "2";
  if(gameMembers.length){
    pushTokens = [];
    userPushTokens = [];
    gameMembers.forEach((member)=>{
      gameMemberData = member.userId;
      if(gameMemberData){
        if(
          gameMemberData.notificationEnabled == true &&
        gameMemberData.pushToken.length &&
        gameMemberData.isDeleted != true
        ){
          if (userBooked.toString() !== gameMemberData._id.toString()) {
            pushTokens = [...pushTokens, ...gameMemberData.pushToken];
          }
        }
      }
    })

    if (pushTokens.length) {
      reqBody = {
        pushToken: pushTokens,
        title: "11NOW",
        message: message,
        data: { type: type, gameId: gameId.toString() },
      };
      const apiResponse = await getApi(
        apiURL.SEND_MOBILE_PUSH,
        "POST",
        reqBody,
        "multiple"
      ); //Mobile Push Send
    } 
  }
    await pitchBookings.updateOne({_id:bookingId},{ $set:{ gamePushSended: true}})
    
  }
}
