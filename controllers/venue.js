const { Types, now } = require("mongoose")
var ObjectId = require('mongodb').ObjectID;
const logger = require("../modules/logger");
const dotenv = require("dotenv");
dotenv.config();
const venue = require("../models/app.venue");
const quickLinks = require("../models/app.quickLinks");
const pitchBooking = require("../models/app.pitchBooking");
const pitchBlocking = require("../models/app.pitchBlocking");
const availabilityTable = require("../models/app.venueAvailability");
const AppUser = require("../models/app.user");
const Game = require("../models/app.game");
const specialAvailabilityScheema = require("../models/app.specialAvailability");
const unavailabilityScheema = require("../models/app.unavilability");
const specialPriceScheema = require("../models/app.specialPrice");
const Notification = require("../models/app.notification");
const transaction = require("../models/app.transaction");
const referredGround = require("../models/app.referredGround");
const refundPolicyModel = require("../models/app.refundPolicy");
const getApi = require("../modules/api");
const apiURL = require("../utils/apis");
const dayjs = require("dayjs");
const timeRange = require("../data/pitch_timeSlots.json");
const pymentModes = require("../data/paymentType.json");
const utc = require("dayjs/plugin/utc");
const advancedFormat = require('dayjs/plugin/advancedFormat');
const country = require("../models/master.country");
const offers = require("../models/app.offers");
const highlights = require("../models/app.highlights")
const surfaces = require("../models/app.surfaces");
const reviewModel = require("../models/app.reviews");
const taxModel = require("../models/app.taxes");
const owner = require("../models/app.owner")
const ownerBlockModel = require("../models/app.ownerBlock")
const stringTemplateParser = require("../modules/notification");
var notificationTemplate = require("../data/notification.json").en;
const stripe = require('stripe')(process.env.SECRET_KEY);
dayjs.extend(utc);
dayjs.extend(advancedFormat);
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
const isBetween = require('dayjs/plugin/isBetween')
dayjs.extend(isBetween)
var isSameOrAfter = require('dayjs/plugin/isSameOrAfter')
dayjs.extend(isSameOrAfter)




exports.getVenueList = async (req, res, next) => {
  let venues;
  let total;
  let totalPages;
  let filters;
  let surface;
  let price;
  let pitchSize;
  let rating;
  let highlightsFilter;
  const pageNo = isNaN(Number(req.body.page)) ? 1 : Number(req.body.page);
  const limit = isNaN(Number(req.body.size)) ? 10 : Number(req.body.size);
  let query = {};

  let sort = {};
  if (req.body.sort) {
    sort = req.body.sort;
  }

  if (!req.body.coordinates) {
    return res.send({
      statusCode: 404,
    });
  }

  if (req.body.search) {
    let text = req.body.search.toString();

    query = {
      $and: [
        {
          $or: [
           { "name": { $regex: new RegExp(text, "i") } },
           { "location.name": { $regex: new RegExp(text, "i") } }
         ]
        },
        {
          "isDeleted": {$exists:false}
        }
      ]
     }

  }

  query["isPublished"] = { $eq: true };
  query["isDeleted"] = {$exists:false};

  let geoQuery;
  if (req.body) {
    if (req.body.coordinates.lng && req.body.coordinates.lat) {
      const coordinates = [req.body.coordinates.lng, req.body.coordinates.lat];
      geoQuery = {
        near: { type: "Point", coordinates: coordinates },
        distanceField: "distance",
        maxDistance: 300000,
        // query: { category: "Parks" },
        // includeLocs: "dist.location",
        // spherical: true
      }
    } else {
      return res.send({
        statusCode: 404,
        status: "coordinates (lat, lng) required"
      });
    }
  }

  let reqDate = "1999-01-01"


  if (req.body.filter) {

    // if (req.body.filter.surface) {
    //   query["grounds.surfaceName"] = { $all: req.body.filter.surface }
    // }

    if (req.body.filter.rating) {
      query["rating"] = { $gte: req.body.filter.rating }
    }

    // if (req.body.filter.highlights) {
    //   query["highlights.title"] = { $in: req.body.filter.highlights }
    // }

    if (req.body.filter.offer) {
      query["offers._id"] = { $exists: true }
    }

    if (req.body.filter.pitchSize) {
      query["grounds.pitches.name"] = { $all: req.body.filter.pitchSize }
    }

  }

  if (req.body.date && (req.body.timeRange || req.body.timeRange == 0)) {
    reqDate = req.body.date;
    let bookingDay = dayjs(req.body.date);
    let day = parseInt(bookingDay.format("d"));
    query["$and"] = [
      { "grounds.pitches.price.day": { $eq: day } },
      {
        "$or": [
          { 'availableTimeRange.date': { $nin: [req.body.date] } },
          { 'availableTimeRange.timeRange': { $nin: [req.body.timeRange] } }
        ]
      }
    ]
  }

  if (req.body.country) {
    query["currency.shortcode"] = { $eq: req.body.country }
  } else {
    return res.send({
      statusCode: 404,
      status: "country required"
    });
  }

  try {
    let agrigateQuery = [
      { $geoNear: geoQuery },
      {
        $lookup: {
          from: 'app.venueAvailability',
          let: {
            venueId: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr:
                {
                  $and:
                    [
                      { $eq: ["$venueId", "$$venueId"] },
                      { $eq: ["$date", reqDate] }
                    ]
                }
              }
            },
          ],
          as: "availableTimeRange"
        }
      },
      {
        $lookup:
        {
          from: 'master.country',
          localField: "country._id",
          foreignField: "_id",
          as: "currency"
        }
      },
      {
        $lookup:
        {
          from: 'app.offers',
          localField: "offers._id",
          foreignField: "_id",
          as: "offers"
        }
      },
      {
        $lookup:
        {
          from: 'app.surfaces',
          localField: "grounds.type",
          foreignField: "_id",
          as: "surfaces"
        }
      },
      {
        $lookup:
        {
          from: 'app.unavailability',
          localField: "_id",
          foreignField: "venueId",
          as: "venueUnavailability"
        }
      },
      {
        $lookup:
        {
          from: 'app.unavailability',
          localField: "owner",
          foreignField: "ownerId",
          as: "ownerUnavailability"
        }
      },
      {
        $lookup:
        {
          from: 'app.highlights',
          localField: "highlights._id",
          foreignField: "_id",
          as: "highlights"
        }
      },
      { $match: query }
    ]


    agrigateQuery.push({
      $addFields: {
        venueUnavailabilitySize: { $size: "$venueUnavailability" },
        ownerUnavailabilitySize: { $size: "$ownerUnavailability" },
        offerHighlights: "$offers",
        surfaces: "$surfaces",
        highlights: "$highlights"
      }
    })

    agrigateQuery.push({
      $project: {
        name: 1,
        images: 1,
        defaultImage: 1,
        location: 1,
        totalReviews: 1,
        surfaces: 1,
        highlights: 1,
        isBookable: 1,
        isPublished: 1,
        rating: 1,
        totalBookings: 1,
        distance: 1,
        offerHighlight: 1,
        startingPrice: 1,
        offerHighlights: 1,
        venueUnavailability: 1,
        ownerUnavailability: 1,
        venueUnavailabilitySize: 1,
        owner: 1,
        currency: {
          "$arrayElemAt": ["$currency.currency", 0]
        }
      }
    })

    if (req.body.filter && req.body.filter.maxPrice!=="" && req.body.filter.minPrice!=="") {
      agrigateQuery.push({ $match: { startingPrice: { $gte: req.body.filter.minPrice, $lte: req.body.filter.maxPrice} } })
    }

    if (req.body.filter && req.body.filter.highlights) {
      agrigateQuery.push({ $match: { "highlights.title":{ $all: req.body.filter.highlights} } })
    }

    if (req.body.filter && req.body.filter.surface) {
      agrigateQuery.push({ $match: { "surfaces.surfaceName":{ $all: req.body.filter.surface} } })
    }

    if (Object.keys(sort).length > 0) {
      agrigateQuery.push({ $sort: sort })
    }

    agrigateQuery.push({
      $facet: {
        data: [
          {
            $project: {
              name: 1,
              images: 1,
              defaultImage: 1,
              location: 1,
              totalReviews: 1,
              surfaces: 1,
              highlights: 1,
              isBookable: 1,
              isPublished: 1,
              rating: 1,
              totalBookings: 1,
              distance: 1,
              startingPrice: 1,
              offerHighlights: 1,
              currency: 1,
              owner: 1
            }
          }
        ],
        totalCount: [{ $count: 'totalCount' }]
      },
    }
    )

    agrigateQuery.push({ $skip: limit * (pageNo - 1) })
    agrigateQuery.push({ $limit: limit })
    agrigateQuery.push({
      $project: {
        totalCount: 1,
        data: 1
      }
    })

    venues = await venue.aggregate(agrigateQuery)

    console.log(venues)

    if (venues[0].totalCount[0] && venues[0].totalCount[0].totalCount) {
      total = venues[0].totalCount[0].totalCount;
    } else {
      total = 0;
    }

    highlightsFilter = await highlights.distinct("title");
    surface = await surfaces.distinct("surfaceName");
    pitchSize = await venue.distinct("grounds.pitches.count");
    rating = await venue.distinct("rating");
    price = await venue.distinct("grounds.pitches.price.priceChart.price");
    let countryItem = await country.findOne({ shortcode: req.body.country })

    if (!countryItem) {
      return res.send({
        statusCode: 404,
        status: "not a valid country"
      });
    }

    filters = {
      surface: surface,
      pitchSize: pitchSize,
      rating: rating,
      highlights: highlightsFilter,
      price: price,
      currency: countryItem.currency,
      minPrice: Math.min(...price),
      maxPrice: Math.max(...price),
    }
    totalPages = limit === 0 ? 1 : Math.ceil(total / limit);

    if (total) {
      response = {
        statusCode: 200,
        data: {
          total: total,
          pages: totalPages,
          page: pageNo,
          filters: filters,
          data: venues[0].data,
        },
      };
    } else {
      response = {
        statusCode: 200,
        data: {
          total: 0,
          pages: 1,
          page: 1,
          filters: filters,
          data: []
        }
      };
    }
    return res.send(response);
  } catch (err) {
    console.log(err)
    return res.send({
      statusCode: 404,
      status: "We are not serving at this area"
    });
  }

};

exports.getVenueDetails = async (req, res, next) => {
  if (!req.body.vid || req.body.vid == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }
  const venueId = req.body.vid;

  let ven = [];
  let surface = [];
  try {
    ven = await venue.findOne({ _id: venueId })
      .select({
        name: 1,
        description: 1,
        ownerId: 1,
        workingHours: 1,
        offers: 1,
        isBookable: 1,
        isPublished: 1,
        distance: 1,
        images: 1,
        location: 1,
        highlights: 1,
        totalReviews: 1,
        grounds: 1,
        country: 1,
        state: 1,
        city: 1,
        rating: 1,
        totalBookings: 1,
        distance: 1,
        startingPrice: 1,
        offerHighlight: 1,
        contacts: 1,
        timeZone: 1
      })
      .populate({
        path: "country._id",
        select: "currency"
      })
      .populate({
        path: "offers._id",
        match: { isDeleted: { "$exists": false }, isExpired: { "$exists": false } },
        select: "name type offer date offerType days"
      })
      .populate({
        path: "highlights._id",
        select: "title description image"
      })
      .populate({
        path: "grounds.type",
        select: "surfaceName surfaceColor type"
      })


    if (!ven) {
      return res.send({
        statusCode: 404,
        status: "No Venues"
      });
    }


    ven.grounds.forEach((item) => {
      let alredyExist = surface.findIndex((x) => x.type == item.type.surfaceName)
      if (alredyExist == -1) {
        surface.push(item.type)
      }
      const uniqueItems = [...new Map(item.pitches.map(item =>
        [item.count, item])).values()];
      item.pitches = uniqueItems
    })


    const uniqueSurface = surface.filter((thing, index, self) =>
    index === self.findIndex((t) => (
      t._id === thing._id
    ))
  )
    ven.surfaces = uniqueSurface;

    return res.send({
      statusCode: 200,
      data: {
        data: ven,
      },
    });

  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

};

exports.getQuickLinks = async (req, res, next) => {
  let pitchBookingLinks;
  try {
    pitchBookingLinks = await quickLinks.find({})
      .select({
        title: 1,
        bg_color: 1,
        linkTo: 1,
        icon: 1
      })

    if (pitchBookingLinks) {
      response = {
        statusCode: 200,
        data: {
          data: pitchBookingLinks,
        },
      };
    } else {
      response = {
        statusCode: 200,
        message: "No Result"
      };
    }

    return res.send(response);
  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
};

exports.getMapView = async (req, res, next) => {
  let venues;
  let total;
  let totalPages;
  const pageNo = isNaN(Number(req.body.page)) ? 1 : Number(req.body.page);
  const limit = isNaN(Number(req.body.size)) ? 20 : Number(req.body.size);
  let query = {};
  console.log(req.body.coordinates.bottomLeft.lng);

  if (!req.body.coordinates.bottomLeft.lat && !req.body.coordinates.bottomLeft.lng
    && !req.body.coordinates.upperRight.lat && !req.body.coordinates.upperRight.lng) {
    return res.send({
      statusCode: 404,
      status: "coordinates required"
    });
  }

  if (!req.body.userCoordinates) {
    return res.send({
      statusCode: 404,
      status: "userCoordinates required"
    });
  }

  if (req.body.coordinates) {
    query["location"] = { $geoWithin: { $box: [[req.body.coordinates.bottomLeft.lng, req.body.coordinates.bottomLeft.lat,], [req.body.coordinates.upperRight.lng, req.body.coordinates.upperRight.lat]] } }
  }
  query["isPublished"] = { $eq: true };
  query["isDeleted"] = {$exists:false};

  try {
    venues = await venue.find(query)
      .select({
        name: 1,
        images: 1,
        defaultImage: 1,
        location: 1,
        totalReviews: 1,
        isBookable: 1,
        isPublished: 1,
        surfaces: 1,
        rating: 1,
        totalBookings: 1,
        startingPrice: 1,
        offers: 1,
      })
      .populate({
        path: "country._id",
        select: "currency"
      })
      .populate({
        path: "offers._id",
        select: "name type offer date offerType days"
      })
      .populate({
        path: "grounds.type",
        select: "surfaceName surfaceColor type"
      })
      .skip(limit * (pageNo - 1))
      .limit(limit)
      .lean();

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2 - lat1);  // deg2rad below
      var dLon = deg2rad(lon2 - lon1);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c; // Distance in km
      return d;
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180)
    }

    venues.map((venue) => {
      let newVenue = venue;
      let distance = getDistanceFromLatLonInKm(req.body.userCoordinates.lat, req.body.userCoordinates.lng, venue.location.coordinates.lattitude, venue.location.coordinates.longitude)
      distance = distance * 1000;
      distance = Math.round(distance);
      newVenue["distance"] = distance;
      // console.log("distance",distance);
      return newVenue;
    })


    total = await venue.countDocuments(query);
    console.log(total);

    if (venues) {
      response = {
        statusCode: 200,
        data: {
          total: total,
          pages: totalPages,
          page: pageNo,
          data: venues,
        },
      };
    } else {
      response = {
        statusCode: 200,
        message: "No Result",
        total: 0,
        pages: 0,
        page: pageNo,
        venues: [],
      };
    }

    return res.send(response);
  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

};

exports.getReviews = async (req, res, next) => {
  if (!req.body.vid || req.body.vid == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }

  let venueId = req.body.vid;
  let rating;
  let reviews;
  let totalPages;
  let totalReview;
  // let reviewList = [];
  let total;
  let skip;
  const pageNo = isNaN(Number(req.body.page)) ? 1 : Number(req.body.page);
  let limit = isNaN(Number(req.body.size)) ? 5 : Number(req.body.size);
  let sort = {};

  let query = {};
  query["venueId"] = { $eq: venueId };
  if (req.body.search) {
    let text = req.body.search;
    query = {
      $and: [
        {
          $or: [
            { "name": { $regex: new RegExp(text, "i") } },
            { "content": { $regex: new RegExp(text, "i") } }
          ]
        },
        {
          "venueId": { $eq: venueId }
        }
      ]
    }
  }


  try {

    let reviews = await reviewModel.find(query)
      .populate({
        path:"userId",
        select:"name profileImage"
      })
      .skip(limit * (pageNo - 1))
      .limit(limit)
      .lean();
    if (!reviews) {
      return res.send({
        statusCode: 404,
        status: "reviews not found"
      });
    }
    total = await reviewModel.countDocuments(query)
    totalReview = await venue.findById(venueId)
      .select({
        rating: 1
      })
    rating = totalReview.rating;

    totalPages = limit === 0 ? 1 : Math.ceil(total / limit);
    limit = (pageNo * limit)
    skip = limit - 5;


    if (reviews) {
      response = {
        statusCode: 200,
        data: {
          total: total,
          rating: rating,
          pages: totalPages,
          page: pageNo,
          data: reviews
        },
      };
    } else {
      response = {
        statusCode: 200,
        message: "No Result",
        total: 0,
        pages: 0,
        page: pageNo,
        reviews: [],
      };
    }

    return res.send(response);

  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

};


exports.postReview = async (req, res, next) => {
  if (!req.body.vid || req.body.vid == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }

  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }


  if (!req.body.rating || req.body.rating == '') {
    return res.send({ statusCode: 500, status: "Valid 'rating' required" });
  }

  let venueId = req.body.vid != undefined ? req.body.vid : "";
  let userId = req.body.userId != undefined ? req.body.userId : "";
  let content = req.body.content != undefined ? req.body.content : "";
  let rating = req.body.rating != undefined ? req.body.rating : "";
  let averageRating;
  // let currentDate = new Date();
  let currentDate = dayjs().utc().format();
  let venues;


  try {
    venues = await venue.findById({ _id: Types.ObjectId(venueId) });
    if (!venues) {
      return res.send({
        statusCode: 404,
        status: "venue not found"
      });
    }

    let existingReview = await reviewModel.find({ userId: userId, venueId: venueId })
    if (existingReview.length > 0) {
      if (existingReview[0].isDeleted == true) {
        let reviewId = existingReview[0]._id
        let undeleteReview = await reviewModel.updateOne({ _id: reviewId }, { $unset: { isDeleted: "" } })
        existingReview[0].content = content;
        existingReview[0].time = currentDate;
        existingReview[0].rating = rating;
      } else {
        existingReview[0].content = content;
        existingReview[0].time = currentDate;
        existingReview[0].rating = rating;
      }
      await existingReview[0].save();
    } else {
      let review = new reviewModel({
        userId: Types.ObjectId(userId),
        venueId: venueId,
        content: content,
        rating: rating,
        time: currentDate
      })

      await review.save();
      let createdReview = {
        _id: review._id
      }

      venues.reviews.push(createdReview);
      venues.totalReviews = venues.totalReviews ? venues.totalReviews + 1 : 1;
    }

    await venues.save();
    console.log(22222)


    averageRating = await reviewModel.aggregate([
      {
        $match: {
          venueId: Types.ObjectId(venueId)
        }
      },
      {
        $group: {
          _id: "$venueId",
          average: { $avg: "$rating" }
        }
      }
    ])

    console.log(averageRating[0].average);

    let average = Math.round(averageRating[0].average)
    venues.rating = average;

    await venues.save();

    return res.send({
      statusCode: 200,
      data: {
        result: venues,
      },
    });
  }
  catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

};

exports.bookPitch = async (req, res, next) => {
  if (!req.body.unit || req.body.unit == '') {
    return res.send({ statusCode: 500, status: "Valid 'unit' required" });
  }

  if (!req.body.venueId || req.body.venueId == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }

  if (!req.body.groundId || req.body.groundId == '') {
    return res.send({ statusCode: 500, status: "Valid 'groundId' required" });
  }

  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }

  if (!req.body.pitchType || req.body.pitchType == '') {
    return res.send({ statusCode: 500, status: "Valid 'pitchType' required" });
  }

  if (!req.body.totalAmount || req.body.totalAmount == '') {
    return res.send({ statusCode: 500, status: "Valid 'totalAmount' required" });
  }

  if (!req.body.booking || req.body.booking.length == 0) {
    return res.send({ statusCode: 500, status: "Valid 'booking' array required" });
  }

  if (!req.body.timeOffSet) {
    return res.send({
      statusCode: 404,
      message: "No timeOffset"
    });
  }

  const pitchUnit = req.body.unit;
  const venueId = req.body.venueId;
  const groundId = req.body.groundId;
  const userId = req.body.userId;
  let totalAmount = req.body.totalAmount;
  const pitchType = req.body.pitchType;
  const bookingReqSlots = req.body.booking;
  let venueItem;
  let createdBookings = [];
  let percentageOffers = [];
  let fixedOffers = [];
  let offerDetails = [];
  let taxes;
  let taxDetails = [];
  let totalDiscount;
  let amountBreakDown;
  let initialAmount = totalAmount;
  let currentDate = dayjs().utc().format();
  let selectedPitch = ''
  let firstBookingDay = ''
  let venueValidation;


  try {
    venueValidation = await venue.findById(venueId);
    if (venueValidation.isPublished == false) {
      return res.send({ statusCode: 500, status: "Venue not available for Booking, Please select other venue'" });
    }

    let foo = function (length) { //length should be <= 7
      return Math.random().toString(36).toUpperCase().replace(/[0-9O]/g, '').substring(1, length + 1)
    }

    let referenceId = foo(4) + foo(4)
    let timeOffset = req.body.timeOffSet;
    let today = dayjs().utcOffset(timeOffset);
    let time = today.format("HH:mm");



    venueItem = await venue.find({ _id: venueId })
      .select({
        name: 1,
        grounds: 1,
        pitches: 1,
        totalBookings: 1,
        offers: 1,
        paymentOptions: 1,
        owner: 1,
        taxes: 1
      })
      .populate({
        path: "country._id",
        select: 'taxes , currency , shortcode, country'
      })
      .populate({
        path: "offers._id",
        match: { isDeleted: { "$exists": false }, isExpired: { "$exists": false } },
        select: "name type offer date offerType days"
      })
      .populate({
        path: "grounds.offers._id",
        match: { isDeleted: { "$exists": false }, isExpired: { "$exists": false } },
        select: "name type offer date offerType days"
      })
      .populate({
        path: "grounds.pitches.offers._id",
        match: { isDeleted: { "$exists": false }, isExpired: { "$exists": false } },
        select: "name type offer date offerType days"
      })
      .populate({
        path: "taxes._id",
        select: "taxValue taxName type"
      })

    let unavailabilityList = await unavailabilityScheema.aggregate([
      {
        $match: {
          "$or": [{ "groundId": Types.ObjectId(groundId) }, { "venueId": Types.ObjectId(venueId) }, { "ownerId": Types.ObjectId(venueItem[0].owner) }],
          "isDeleted": { $exists: false }
        }
      },
      {
        $project: {
          "from": 1,
          "to": 1
        }
      }
    ]);


    for (const item of unavailabilityList) {
      let start = dayjs(item.from).utcOffset(timeOffset).format('YYYY-MM-DD')
      let end = dayjs(item.to).utcOffset(timeOffset).format('YYYY-MM-DD');
      let checkDaay1 = bookingReqSlots[0].bookingDate;
      

      if (dayjs(checkDaay1).isBetween(start, end, 'day', [])) {
        return res.send({
          statusCode: 404,
          status: "Venue Not available on this day"
        });
      }

      if (bookingReqSlots[1]) {
        let checkDaay2 = bookingReqSlots[1].bookingDate;
        if (dayjs(checkDaay2).isBetween(start, end, 'day', [])) {
          return res.send({
            statusCode: 404,
            status: "Venue Not available on this day"
          });
        }
      }
    }

    let ownerOffers = await offers.find({ "ownerId": venueItem[0].owner, offerType: 1, isDeleted: { "$exists": false }, isExpired: { "$exists": false } })


    let currency = venueItem[0].country._id.currency;
    let countryShortcode = venueItem[0].country._id.shortcode;
    let country = venueItem[0].country._id.country;


    let ground = venueItem[0].grounds.find(e => e._id == groundId)
    let pitches = ground.pitches;
    let pitchesWithInunit = pitches.filter((e) => e.count == pitchUnit)

    const venueName = venueItem[0].name;
    const owner = venueItem[0].owner;


    // find available slots and book
    for (const reqItem of bookingReqSlots) {
      let slot = timeRange.find(e => reqItem.timeId.includes(e.id))
      if (!(dayjs(reqItem.bookingDate).isSameOrAfter(today, "date")) || today.format("DD-MM-YYYY") == dayjs(reqItem.bookingDate).format('DD-MM-YYYY') && (dayjs(`01/01/2011 ${time}:00`).isAfter(dayjs(`01/01/2011 ${slot.from}:00`)))) {
        return res.send({ statusCode: 500, status: "Please provide valid 'Time and Date'" });
      }

      let timeId = reqItem.timeId;
      const date = reqItem.bookingDate;
      const bookingDate = new Date(date);
      const bookingDay = bookingDate.getDay();



      if (firstBookingDay == '') {
        firstBookingDay = bookingDay;
      }

      let blockings = await pitchBlocking.find({
        groundId: groundId,
        type: pitchUnit,
        "booking.date": date,
        "booking.timeSlots": { $in: timeId }
      })

      let ownerBlock = await ownerBlockModel.find({
        groundId: groundId,
        type: pitchUnit,
        "booking.date": date,
        "booking.timeSlots": { $in: timeId }
      })

      let bookingPitch = null;
      pitchesWithInunit.every((item) => {
        let index = blockings.findIndex((e) => (e.pitchId.toString() == item._id.toString()))
        let index1 = ownerBlock.findIndex((e) => (e.pitchId.toString() == item._id.toString()))
        if (index == -1 && index1 == -1) {
          bookingPitch = item;
          return false;
        }
        return true;
      })

      if (bookingPitch == null) {
        return res.send({ statusCode: 500, status: "Pitches not availble to meet your request" });
      }

      if (selectedPitch == '') {
        selectedPitch = bookingPitch
      }



      const booking = {
        pitchId: bookingPitch._id,
        timeId: timeId,
        dayId: bookingDay,
        date: date
      }

      const blocking = {
        date: date,
        timeSlots: timeId,
        referenceId: referenceId
      }

      createdBookings.push(booking)

      const newPitchBlocking = new pitchBlocking({
        venueId: venueId,
        groundId: groundId,
        pitchId: bookingPitch._id,
        type: bookingPitch.count,
        booking: blocking,
        blockCount: 1,
        createdAt: currentDate
      })


      bookingPitch.children.forEach(async (pitch) => {
        let currentChildPitch = pitches.find(e => e.id == pitch.pitchId)
        const newPitchBlocking = new pitchBlocking({
          venueId: venueId,
          groundId: groundId,
          pitchId: pitch.pitchId,
          type: currentChildPitch.count,
          booking: blocking,
          blockCount: 1,
          createdAt: currentDate
        })
        await newPitchBlocking.save();
      })
      bookingPitch.parent.forEach(async (pitch) => {
        let currentParentPitch = pitches.find(e => e.id == pitch.pitchId)
        existingPitchBLock = await pitchBlocking.find({
        groundId: groundId,
        pitchId: pitch.pitchId,
        "booking.date": date,
        "booking.timeSlots": { $in: timeId }
      })
      if(existingPitchBLock.length > 0){
           console.log("existinggggggg")
           existingPitchBLock[0].blockCount = existingPitchBLock[0].blockCount + 1;
           await existingPitchBLock[0].save();
         }
      if(existingPitchBLock.length == 0){
        console.log("not  existinggggggg")
        const newPitchBlocking = new pitchBlocking({
          venueId: venueId,
          groundId: groundId,
          pitchId: pitch.pitchId,
          type: currentParentPitch.count,
          booking: blocking,
          blockCount: 1,
          createdAt: currentDate
        })
        await newPitchBlocking.save();
      }
      })
      venueItem[0].totalBookings = venueItem[0].totalBookings ? venueItem[0].totalBookings + 1 : 1

      await venueItem[0].save();
      await newPitchBlocking.save();

    }

    const checkOfferDate = (start, end) => {

      let booking_Date = dayjs(bookingReqSlots[0].bookingDate);
      let start_date = dayjs(start, 'DD-MM-YYYY')
      let end_date = dayjs(end, 'DD-MM-YYYY')
      return (dayjs(booking_Date).isBetween(start_date, end_date) || dayjs(booking_Date).isSame(start_date) || dayjs(booking_Date).isSame(end_date))
    }

    // Amount breakdown calculation
    ownerOffers.map((offer) => {
      if (offer.days && offer.days.includes(firstBookingDay)
        && checkOfferDate(offer.date.startDate, offer.date.endDate)
      ) {
        if (offer.type == 0) {
          percentageOffers.push(offer._id.offer)
        } else {
          fixedOffers.push(offer.offer)
        }
        let offerBreakDown = {
          name: offer.name,
          percentage: offer.offer,
        }
        offerDetails.push(offerBreakDown);
      }
    })

    venueItem[0].offers.map((offer) => {
      if (offer._id.days && offer._id.days.includes(firstBookingDay)
        && checkOfferDate(offer._id.date.startDate, offer._id.date.endDate)
      ) {
        if (offer._id.type == 0) {
          percentageOffers.push(offer._id.offer)
        } else {
          fixedOffers.push(offer._id.offer)
        }
        let offerBreakDown = {
          name: offer._id.name,
          percentage: offer._id.offer,
        }
        offerDetails.push(offerBreakDown);
      }
    })

    if (ground.offers.length > 0) {

      ground.offers.map((offer) => {
        if (offer._id.days && offer._id.days.includes(firstBookingDay)
          && checkOfferDate(offer._id.date.startDate, offer._id.date.endDate)) {
          if (offer._id.type == 0) {
            percentageOffers.push(offer._id.offer)
          } else {
            fixedOffers.push(offer._id.offer)
          }
          let offerBreakDown = {
            name: offer._id.name,
            percentage: offer._id.offer,
          }
          offerDetails.push(offerBreakDown);
        }
      })
    }

    if (selectedPitch.offers.length > 0) {
      selectedPitch.offers.map((offer) => {
        if (offer._id.days.includes(firstBookingDay)
          && checkOfferDate(offer._id.date.startDate, offer._id.date.endDate)) {
          if (offer._id.type == 0) {
            percentageOffers.push(offer._id.offer)
          } else {
            fixedOffers.push(offer._id.offer)
          }
          let offerBreakDown = {
            name: offer._id.name,
            percentage: offer._id.offer,
          }
          offerDetails.push(offerBreakDown);
        }
      })
    }

    function percentage(num, per) {
      return (num / 100) * per;
    }

    let percentagetotalOffer = 0;
    percentageOffers.map((offer) => {
      percentagetotalOffer = percentagetotalOffer + offer;
    })

    let fixedtotalOffer = 0;
    fixedOffers.map((offer) => {
      fixedtotalOffer = fixedtotalOffer + offer;
    })

    if (percentagetotalOffer > 0) {
      totalDiscount = percentage(totalAmount, percentagetotalOffer)
      totalDiscount = Math.round(totalDiscount * 100) / 100
      totalAmount = totalAmount - percentage(totalAmount, percentagetotalOffer)
    }

    if (fixedtotalOffer > 0) {
      totalDiscount = fixedtotalOffer
      totalAmount = totalAmount - fixedtotalOffer
    }

    let offeredAmount = totalAmount;

    // taxes = venueItem[0].country._id.taxes;
    taxes = venueItem[0].taxes;
    console.log("tax",taxes)
    for(tax of taxes){
      if(tax._id.type == 1){
        let taxPercentage = percentage(offeredAmount, tax._id.taxValue)
        taxPercentage = Math.round(taxPercentage * 100) / 100
        totalAmount = totalAmount + percentage(offeredAmount, tax._id.taxValue)
        let taxBreakDown = {
        name: tax._id.taxName,
        percentage: tax._id.taxValue,
        type: tax._id.type,
        amount: taxPercentage
      }
      taxDetails.push(taxBreakDown);
      }else{
        let taxAmount = tax._id.taxValue
        totalAmount = totalAmount + taxAmount;
        let taxBreakDown = {
          name: tax._id.taxName,
          type: tax._id.type,
          amount : tax._id.taxValue
        }
        taxDetails.push(taxBreakDown);
      }
    }
    // taxes.forEach((tax) => {
    //   let taxPercentage = percentage(offeredAmount, tax.percentage)
    //   taxPercentage = Math.round(taxPercentage * 100) / 100
    //   totalAmount = totalAmount + percentage(offeredAmount, tax.percentage)
    //   let taxBreakDown = {
    //     name: tax.name,
    //     percentage: tax.percentage,
    //     amount: taxPercentage
    //   }
    //   taxDetails.push(taxBreakDown);
    // })
    console.log(taxDetails)
    totalAmount = Math.round(totalAmount * 100) / 100

    amountBreakDown = {
      pitchPriceTotal: initialAmount,
      taxes: taxDetails,
      offerDiscounts: offerDetails,
      totalDiscountAmount: totalDiscount,
      totalAmount: totalAmount
    }

    if (createdBookings.length != bookingReqSlots.length) {
      return res.send({ statusCode: 500, status: "one of date not availble to meet your request" });
    }

    const createdBooking = new pitchBooking({
      venueId: venueId,
      groundId: groundId,
      referenceId: referenceId,
      pitchId: selectedPitch._id,
      userId: userId,
      venueName: venueName,
      venueOwner: owner,
      pitchName: selectedPitch.name,
      pitchType: pitchType,
      booking: createdBookings,
      totalAmount: totalAmount,
      currency: currency,
      countryShortcode: countryShortcode,
      country: country,
      status: 1,
      paymentOptions: [],
      createdAt: currentDate,
      amountBreakDown: amountBreakDown,
      pitchSize: pitchUnit,
    });
    await createdBooking.save()



    let newpaymentOptions = venueItem[0].paymentOptions.map((x) => {
      return pymentModes.find((ee) => ee.id == x)
    })
    createdBooking.paymentOptions = newpaymentOptions;

    return res.send({
      statusCode: 200,
      data: {
        booking: createdBooking,
        amountBreakDown: amountBreakDown,
        paymentOptions: newpaymentOptions
      },
    });
  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
};

exports.referrGround = async (req, res, next) => {
  if (!req.body.location || req.body.location == '') {
    return res.send({ statusCode: 500, status: "Valid 'location' required" });
  }
  let userId = req.body.userId;
  let userEmail = req.body.email;
  let groundName = req.body.groundName;
  let location = req.body.location;
  let details = req.body.details;
  let contact = req.body.contact;
  let name = req.body.name;
  let apiAdminResponse;
  let apiResponse;

  const ground = new referredGround({
    groundName: groundName,
    details: details,
    email: userEmail,
    location: location,
    contact: contact,
    userId: userId
  });

  const reqBody = {
    email: userEmail,
    data: {
      name: name,
      subject: "11Now User Feedback",
      message: "Your feedback has been submitted successfully.",
      template: "referGround",
    },
  };

  const reqAdminBody = {
    email: "sudhinpathiyil@gmail.com",
    // ccEmail: "shijoy@kodsmith.com,vipin@kodsmith.com,sudhin@kodsmith.com",
    data: {
      name: name,
      email: userEmail,
      mobile: contact,
      feedbackAt: dayjs(now).format("DD MMM YYYY h:mm A"),
      feedback: "test",
      subject: "11Now User Refered Ground",
      message: "test message",
      template: "referGroundAdmin"
    }
  };

  try {
    await ground.save();
    if (userEmail) {
      apiResponse = await getApi(apiURL.SEND_EMAIL, "POST", reqBody); //Email Send
    }
    apiAdminResponse = await getApi(
      apiURL.SEND_EMAIL,
      "POST",
      reqAdminBody
    );
    return res.send({
      statusCode: 200,
      data: {
        ground: ground,
      },
    });
  }
  catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

}

exports.getAvailability = async (req, res, next) => {
  if (!req.body.timeOffSet) {
    return res.send({
      statusCode: 404,
      message: "No timeOffset"
    });
  }

  if (!req.body.date) {
    return res.send({
      statusCode: 404,
      message: "No date"
    });
  }

  let groundId = req.body.groundId;
  let pitchUnit = req.body.unit;

  let venues;
  let d = req.body.date;
  let bookingDay = dayjs(d);
  let day = parseInt(bookingDay.format("d"));

  let bookings;
  let timeOffset = req.body.timeOffSet;
  let today = dayjs().utcOffset(timeOffset);
  let time = today.format("HH:mm");
  let isSameDay = today.format("DD-MM-YYYY") == bookingDay.format("DD-MM-YYYY")
  let basicAvailabilityOfSlots = null



  try {

    let specialAvailabilityList = await specialAvailabilityScheema.aggregate([
      {
        $match: {
          "date": bookingDay.format("DD/MM/YYYY"),
          "groundId": Types.ObjectId(groundId),
          "pitchSize": pitchUnit
        }
      },
      {
        $project: {
          "pitches": 1,
          "availability": 1,
          "pitchSize": 1
        }
      }
    ]);

    let specialAvailability = specialAvailabilityList.length > 0 ? specialAvailabilityList[0] : undefined


    let specialPriceList = await specialPriceScheema.aggregate([
      {
        $match: {
          "date": bookingDay.format("DD/MM/YYYY"),
          "groundId": Types.ObjectId(groundId),
          "pitchSize": pitchUnit
        }
      },
      {
        $project: {
          "pitches": 1,
          "price": 1,
          "pitchSize": 1
        }
      }
    ]);
    let specialPrice = specialPriceList.length > 0 ? specialPriceList[0] : undefined


    venues = await venue.aggregate([
      {
        $match: {
          "grounds.pitches.count": pitchUnit,
          "grounds._id": Types.ObjectId(groundId)
        }
      },
      {
        $project: {
          "grounds": 1,
          "owner": 1,
        }
      }
    ]);

    let unavailabilityList = await unavailabilityScheema.aggregate([
      {
        $match: {
          "$or": [{ "groundId": Types.ObjectId(groundId) }, { "venueId": Types.ObjectId(venues[0]._id) }, { "ownerId": Types.ObjectId(venues[0].owner) }],
          "isDeleted": { $exists: false }
        }
      },
      {
        $project: {
          "from": 1,
          "to": 1
        }
      }
    ]);

    for (const item of unavailabilityList) {
      let start = dayjs(item.from).utcOffset(timeOffset).format('YYYY-MM-DD')
      let end = dayjs(item.to).utcOffset(timeOffset).format('YYYY-MM-DD');
      let checkDaay = bookingDay.format('YYYY-MM-DD')

      if (dayjs(checkDaay).isBetween(start, end, 'day', [])) {
        return res.send({
          statusCode: 404,
          status: "Venue Not available on this day"
        });
      }
    }

    let ground = venues[0].grounds.find((e) => e._id == groundId)
    let pitchesWithinUnit = ground.pitches.filter((e) => e.count == pitchUnit)

    if (specialAvailability) {
      basicAvailabilityOfSlots = specialAvailability.availability
    } else {
      basicAvailabilityOfSlots = pitchesWithinUnit[0].availability.find((e) => e.day == day)
      if (basicAvailabilityOfSlots) {
        basicAvailabilityOfSlots = basicAvailabilityOfSlots.availabilityChart
      } else {
        return res.send({
          statusCode: 404,
          status: "Venue Not available on this day"
        });
      }
    }

    let basicPriceOfSlots = pitchesWithinUnit[0].price.find((e) => e.day == day)

    if (specialPrice) {
      basicPriceOfSlots = specialPrice.price
    } else {
      if (!basicPriceOfSlots) {
        return res.send({
          statusCode: 404,
          status: "Venue Not available on this day"
        });
      } else {
        basicPriceOfSlots = basicPriceOfSlots.timeRange
      }
    }

    bookings = await pitchBlocking.find({ groundId: groundId, type: pitchUnit, "booking.date": d })
        console.log(bookings)

    // bookings = [...new Map(bookings.map(item =>
    //   [item['pitchId'].toString(), item])).values()]

    // bookings = await pitchBooking.find({ groundId: groundId, pitchSize: pitchUnit, "booking.date": d, status: 3 })
    // .select({
    //   _id: 1,
    //   venueId: 1,
    //   venueName: 1,
    //   pitchType: 1,
    //   pitchName: 1,
    //   booking: 1,
    //   referenceId: 1,
    //   gameId: 1,
    //   status: 1,
    //   userId: 1,
    //   country: 1,
    //   createdAt: 1,
    //   paymentOption: 1,
    //   totalAmount: 1,
    //   currency:1,
    //   pitchId: 1
    // })
    // .populate({
    //   path: 'venueId',
    //   select: 'name'
    // }).
    // populate({
    //   path: "gameId",
    //   select: "gameName"
    // }).
    // populate({
    //   path: "userId",
    //   select: "name"
    // })

  
    ownerBlock = await ownerBlockModel.find({groundId: groundId, pitchUnit: pitchUnit, "booking.date": d})


    let pitchesWithinUnitlength = pitchesWithinUnit.length;

    let finalTimeSlots = basicAvailabilityOfSlots.map((item) => {
      let isOwnerBlock = false;
      let slot = timeRange.find(e => e.id == item.id)

      let bookingCount = 0
      bookings.forEach((booking) => {
        // console.log(booking.booking.referenceId)
        let index = booking.booking.timeSlots.findIndex(e => e == item.id);

        if (index != -1) {
          bookingCount = bookingCount + 1
        }
        
      })

      // bookings.forEach((booking) => {
      //   let bookingDataInSameDate = booking.booking.find(e => e.date == d);
      //   let index = bookingDataInSameDate.timeId.findIndex(e => e == item.id);
      //   if (index != -1) {
      //     bookingCount = bookingCount + 1
      //   }
      // })

      ownerBlock.forEach((block)=>{
        if(block.booking.date == d && block.pitchUnit == pitchUnit){
          let bookingDataInSameDate = block.booking;
        // console.log(bookingDataInSameDate)
        let index = bookingDataInSameDate.timeSlots.findIndex(e => e == item.id);
        if (index != -1) {
          bookingCount = bookingCount + 1
          isOwnerBlock = true;
        }
      }
      })

      if (bookingCount >= pitchesWithinUnitlength && isOwnerBlock) {
        let newItem = item;
        newItem.status = 4;
        return newItem;
      }
      else if (bookingCount >= pitchesWithinUnitlength) {
        let newItem = item;
        newItem.status = 1;
        return newItem;
      } else {
        if ((dayjs(`01/01/2011 ${time}:00`).isAfter(dayjs(`01/01/2011 ${slot.from}:00`))) && isSameDay) {
          let newItem = item;
          newItem.status = 2;
          return newItem;
        } else {
          let newItem = item;
          if (newItem.status == undefined) {
            newItem.status = 2
          }
          return newItem;
        }

      }
    })

    let respinseSlots = finalTimeSlots.map((item) => {
      let price = basicPriceOfSlots.find((x) => x.id == item.id)
      if (price) {
        if (price.price) {
          item.price = price.price
        } else {
          item.price = 0
          item.status = 2
        }
        return item
      } else {
        item.price = 0
        item.status = 2
        return item
      }
    })

    return res.send({
      statusCode: 200,
      data: {
        data: respinseSlots,
      },
    });

  } catch (err) {
    console.log(err);
    return res.send({
      statusCode: 404,
      status: "Something went wrong"
    });
  }

}

exports.getPriceChart = async (req, res, next) => {
  if (!req.body.vid || req.body.vid == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }
  const venueId = req.body.vid;
  let ven = [];
  try {
    ven = await venue.findOne({ _id: venueId })
      .select({
        name: 1,
        surfaces: 1,
        grounds: 1,
      })
      .populate({
        path: "country._id",
        select: "currency"
      });

    return res.send({
      statusCode: 200,
      data: {
        data: ven,
      },
    });

  }
  catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
};

exports.upcomingBookingList = async (req, res, next) => {
  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let bookings;
  let bookingList = [];
  const userId = req.body.userId;
  console.log('mm', userId)
  // let today = new Date();
  let sort = {};
  sort["booking.date"] = 1;
  let timeOffset = req.body.timeOffSet;
  let today = dayjs().utcOffset(timeOffset);
  let time = today.format("HH:mm");

  try {
    bookings = await pitchBooking.find({ userId: Types.ObjectId(userId), isCancelled: { $exists: false }, status: 3 })
      .select({
        _id: 1,
        venueId: 1,
        venueName: 1,
        pitchType: 1,
        pitchName: 1,
        booking: 1,
        referenceId: 1,
        gameId: 1
      })
      .populate({
        path: 'venueId',
        select: 'name timeZone'
      }).
      populate({
        path: "gameId",
        select: "gameName"
      })
      .populate({
        path: "pitchType",
        select: "surfaceName surfaceColor"
      })
      .sort(sort);


    bookings.map((item) => {
      let bookingItem = item.booking[0]
      if (item.booking.length > 1 && dayjs(item.booking[0].date) > dayjs(item.booking[1].date)) {
        bookingItem = item.booking[1]
      }
      let slot = timeRange.find(e => bookingItem.timeId.includes(e.id))
      let bookingDate = dayjs(bookingItem.date);

      console.log((dayjs(`${bookingDate.format("DD/MM/YYYY")}T,${slot.from}:00`,"DD/MM/YYYYTHHmmss").isAfter(dayjs(today, "date"))))
        if(dayjs(`${bookingDate.format("DD/MM/YYYY")}T,${slot.from}:00`,"DD/MM/YYYYTHHmmss").isAfter(dayjs(today, "date"))){
        if (item.gameId) {
          let booking = {
            id: item._id,
            venueId: item.venueId._id,
            venueName: item.venueId.name,
            timeZone: item.venueId.timeZone,
            pitchName: item.pitchName,
            pitchType: item.pitchType,
            bookings: item.booking,
            referenceId: item.referenceId,
            gameId: item.gameId._id,
            gameName: item.gameId.gameName
          }
          bookingList.push(booking);
        } else {
          console.log(1111)
          let booking = {
            id: item._id,
            venueId: item.venueId._id,
            venueName: item.venueId.name,
            timeZone: item.venueId.timeZone,
            pitchName: item.pitchName,
            pitchType: item.pitchType,
            bookings: item.booking,
            referenceId: item.referenceId
          }
          bookingList.push(booking);
        }
      }
    })


    if (!bookings) {
      return res.send({
        statusCode: 404,
        status: "No Bookings available"
      });
    }

    if (bookings) {
      response = {
        statusCode: 200,
        data: {
          data: bookingList,
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        games: [],
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.completedBookingList = async (req, res, next) => {
  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let bookings;
  let bookingList = [];
  const userId = req.body.userId;
  // let today = new Date();
  let sort = {};
  sort["booking.date"] = -1;
  let timeOffset = req.body.timeOffSet;
  let today = dayjs().utcOffset(timeOffset);
  let time = today.format("HH:mm");

  try {
    bookings = await pitchBooking.find({ userId: Types.ObjectId(userId), isCancelled: { $exists: false }, status: 3 })
      .select({
        _id: 1,
        venueId: 1,
        venueName: 1,
        pitchType: 1,
        pitchName: 1,
        booking: 1,
        referenceId: 1,
        gameId: 1
      })
      .populate({
        path: 'venueId',
        select: 'name'
      }).
      populate({
        path: "gameId",
        select: "gameName"
      })
      .populate({
        path: "pitchType",
        select: "surfaceName surfaceColor"
      })
      .sort(sort);

    if (!bookings) {
      return res.send({
        statusCode: 404,
        status: "No Bookings available"
      });
    }

    bookings.map((item) => {

      let bookingItem = item.booking[0]
      if (item.booking.length > 1 && dayjs(item.booking[0].date) > dayjs(item.booking[1].date)) {
        bookingItem = item.booking[1]
      }

      let slot = timeRange.find(e => bookingItem.timeId.includes(e.id))
      console.log(bookingItem.date)
      let bookingDate = dayjs(bookingItem.date);
      console.log(dayjs(`${bookingDate.format("DD/MM/YYYY")}T,${slot.from}:00`,"DD/MM/YYYYTHHmmss").isAfter(dayjs(today, "date")))
      if (dayjs(`${bookingDate.format("DD/MM/YYYY")}T,${slot.from}:00`,"DD/MM/YYYYTHHmmss").isBefore(dayjs(today, "date"))){
      // if (dayjs(today).isAfter(dayjs(`${bookingDate.format("DD/MM/YYYY")} ${slot.from}:00`))) {
        console.log(1111);
        if (item.gameId) {
          let booking = {
            id: item._id,
            venueId: item.venueId._id,
            venueName: item.venueId.name,
            pitchName: item.pitchName,
            pitchType: item.pitchType,
            bookings: item.booking,
            referenceId: item.referenceId,
            gameId: item.gameId._id,
            gameName: item.gameId.gameName
          }
          bookingList.push(booking);
        } else {
          let booking = {
            id: item._id,
            venueId: item.venueId._id,
            venueName: item.venueId.name,
            pitchName: item.pitchName,
            pitchType: item.pitchType,
            bookings: item.booking,
            referenceId: item.referenceId
          }
          bookingList.push(booking);
        }
      }
    })



    if (bookings) {
      response = {
        statusCode: 200,
        data: {
          data: bookingList,
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        games: [],
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.cancelledBookingList = async (req, res, next) => {
  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let bookings;
  let bookingList = [];
  const userId = req.body.userId;
  let sort = {};
  sort["cancelledAt"] = -1;

  try {

    let aggregateQuery = [
      {
        $match: {
          userId: Types.ObjectId(userId),
          isCancelled: { $eq: true }
        }
      },
      {
        $lookup:
        {
          from: 'app.surfaces',
          localField: "pitchType",
          foreignField: "_id",
          as: "pitchType"
        }
      }
    ]

    aggregateQuery.push({
      $addFields: {
        pitchType: "$pitchType",
      }
    })

    aggregateQuery.push({
      $project: {
        _id: 1,
        venueId: 1,
        venueName: 1,
        pitchType: 1,
        pitchName: 1,
        booking: 1,
        referenceId: 1,
        cancelledAt: 1
      }
    })

    bookings = await pitchBooking.aggregate(aggregateQuery)
      .sort(sort)

    // bookings = await pitchBooking.aggregate([
    //   {
    //     $match: {
    //       userId: Types.ObjectId(userId),
    //       isCancelled: { $eq: true }
    //     }
    //   },
    //   {
    //     $lookup:
    //     {
    //       from: 'app.surfaces',
    //       localField: "grounds.pitchType",
    //       foreignField: "_id",
    //       as: "pitchType"
    //     }
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       venueId: 1,
    //       venueName: 1,
    //       // pitchType: 1,
    //       pitchName: 1,
    //       booking: 1,
    //       referenceId: 1,
    //       cancelledAt: 1,
    //       pitchType: {
    //         "$arrayElemAt": ["$pitchType._id",0]
    //       }
    //     }
    //   }
    // ])
    //   .sort(sort);


    bookings.map((item) => {
      let booking = {
        id: item._id,
        venueId: item.venueId,
        venueName: item.venueName,
        pitchName: item.pitchName,
        pitchType: item.pitchType,
        bookings: item.booking,
        referenceId: item.referenceId,
        cancelledAt: item.cancelledAt
      }
      bookingList.push(booking);
    });


    if (!bookings) {
      return res.send({
        statusCode: 404,
        status: "No Bookings available"
      });
    }

    if (bookings) {
      response = {
        statusCode: 200,
        data: {
          data: bookingList,
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        games: [],
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.myBookingDetails = async (req, res, next) => {
  if (!req.body.bookingId || req.body.bookingId == '') {
    return res.send({ statusCode: 500, status: "Valid 'bookingId' required" });
  }
  let bookingId = req.body.bookingId;
  let booking;
  let venues;
  let bookings;
  let transactions;

  try {
    booking = await pitchBooking.findById(bookingId)
      .populate({
        path: "cancelledBy",
        select: "name"
      })
      .populate({
        path: "gameId",
        select: "gameName createdBy"
      })
      .populate({
        path: "venueId",
        select: "isBookable isPublished"
      })
      .populate({
        path: "pitchType",
        select: "surfaceName surfaceColor"
      })
      .populate({
        path: "userId",
        select: "name"
      })


    if (!booking) {
      return res.send({
        statusCode: 404,
        status: "Booking not available"
      });
    }
    // console.log(booking)
    let pitchId = booking.pitchId;
    let venueId = booking.venueId;
    let referenceId = booking.referenceId;

    venues = await venue.findById(venueId)
      .select({
        name: 1,
        location: 1,
        timeZone:1
      })
      .populate({
        path: "country._id",
        select: "currency"
      })

    // console.log(venues)
    transactions = await transaction.find({ referenceId: referenceId })



    if (booking.cancelledAt && booking.refundOption) {
      bookings =
      {
        id: booking._id,
        venueId: venues._id,
        venueName: venues.name,
        location: venues.location,
        timeZone:venues.timeZone,
        surface: booking.pitchType,
        type: booking.pitchName,
        pitchSize: booking.pitchSize,
        booking: booking.booking,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        payments: booking.payments,
        currency: venues.country._id.currency,
        referenceId: booking.referenceId,
        cancelledAt: booking.cancelledAt,
        cancelledBy: booking.cancelledBy && booking.cancelledBy.name ? booking.cancelledBy.name : booking.cancelledByPitchManager ? "Pitch Manager"  : "11Now Admin",
        isBookable: booking.venueId.isBookable,
        isPublished: booking.venueId.isPublished,
        createdAt: booking.createdAt,
        amountBreakDown: booking.amountBreakDown,
        paymentOption: booking.paymentOption,
        refundBreakDown: booking.refundBreakDown,
        refundStatus: transactions[0].refundStatus,
        comments: booking.comments,
        bookedBy: booking.userId.name

      }
    } else if(booking.cancelledAt){
      bookings ={
        id: booking._id,
        venueId: venues._id,
        venueName: venues.name,
        location: venues.location,
        timeZone:venues.timeZone,
        surface: booking.pitchType,
        type: booking.pitchName,
        pitchSize: booking.pitchSize,
        booking: booking.booking,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        payments: booking.payments,
        currency: venues.country._id.currency,
        referenceId: booking.referenceId,
        cancelledAt: booking.cancelledAt,
        cancelledBy: booking.cancelledBy && booking.cancelledBy.name ? booking.cancelledBy.name : booking.cancelledByPitchManager ? "Pitch Manager" : "11Now Admin",
        isBookable: booking.venueId.isBookable,
        isPublished: booking.venueId.isPublished,
        createdAt: booking.createdAt,
        amountBreakDown: booking.amountBreakDown,
        paymentOption: booking.paymentOption,
        comments: booking.comments,
        bookedBy: booking.userId.name
    } 
  }else {
      bookings =
      {
        id: booking._id,
        venueId: venues._id,
        venueName: venues.name,
        location: venues.location,
        timeZone:venues.timeZone,
        surface: booking.pitchType,
        type: booking.pitchName,
        pitchSize: booking.pitchSize,
        booking: booking.booking,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        payments: booking.payments,
        currency: venues.country._id.currency,
        referenceId: booking.referenceId,
        isBookable: booking.venueId.isBookable,
        isPublished: booking.venueId.isPublished,
        createdAt: booking.createdAt,
        amountBreakDown: booking.amountBreakDown,
        paymentOption: booking.paymentOption,
        comments: booking.comments,
        bookedBy: booking.userId.name

      }
    }

    if (booking.gameId) {
      bookings["gameId"] = booking.gameId._id;
      bookings["gameName"] = booking.gameId.gameName;
      bookings["createdBy"] = booking.gameId.createdBy;
    }


    return res.send({
      statusCode: 200,
      data: {
        data: bookings,
        gameId: bookings["gameId"],
        gameName: bookings["gameName"],
        gameCreated: bookings["createdBy"]
      },
    });
  }
  catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

}


// exports.cancelBooking = async (req, res, next) => {
//   if (!req.body.bookingId || req.body.bookingId == '') {
//     return res.send({ statusCode: 500, status: "Valid 'bookingId' required" });
//   }
//   if (!req.body.refundOption || req.body.refundOption == '') {
//     return res.send({ statusCode: 500, status: "Valid 'refundOption' required" });
//   }
//   let bookingId = req.body.bookingId;
//   let refundOption = req.body.refundOption;
//   let booking;
//   let bookings;
//   let game;
//   let refundBreakDown;
//   const userId = req.body.userId;
//   let refundCalculation;
//   let bookingDate;
//   let refundPercentage;
//   const now = Date.now();
//   let currentDate = dayjs().utc().format();

//   try {
//     booking = await pitchBooking.findById(bookingId)
//       .populate({
//         path: "venueId",
//         select: "refundPolicy"
//       });



//     if (!booking) {
//       return res.send({
//         statusCode: 404,
//         status: "No Booking available"
//       });
//     }

//     if (booking.status !== 3) {
//       return res.send({ statusCode: 500, status: "Cancellation Failed, cannot cancel a unsuccessful booking" });
//     }

//     const referenceId = booking.referenceId;

//     booking.isCancelled = true;
//     booking.cancelledAt = now;
//     booking.cancelledBy = userId;
//     booking.status = 5;

//     if(booking.paymentOption == 1){
//       booking.refundOption = refundOption;
//     }

//     await pitchBlocking.deleteMany({ "booking.referenceId": referenceId });
//     if (booking.gameId) {
//       let gameId = booking.gameId
//       bookings = await pitchBooking.updateOne({ _id: bookingId }, { $unset: { gameId: "" } })
//       game = await Game.updateOne({ _id: gameId }, { $unset: { bookingId: "" } })

//     }

//     //conditional check
//     if (booking.paymentOption == 1) {
//       let totalAmount = booking.totalAmount;
//       let startingTime = timeRange.find((e) => e.id == booking.booking[0].timeId[0])
//       startingTime = startingTime.from;
//       if (booking.booking.length > 1) {
//         let date1 = booking.booking[0].date;
//         let date2 = booking.booking[1].date;
//         if ((dayjs(date1).isAfter(dayjs(date2)))) {
//           bookingDate = date2;
//         } else {
//           bookingDate = date1;
//         }
//       } else {
//         bookingDate = booking.booking[0].date;
//       }
//       let bookedDateTime = dayjs(`${bookingDate} ${startingTime}:00`)
//       let DateTimeNow = dayjs();

//       let hourDifference = bookedDateTime.diff(DateTimeNow, 'hour')
//       let refundPolicyId = booking.venueId.refundPolicy._id;
//       let cancellationPolicy = await refundPolicyModel.findById(refundPolicyId)
//       let policies = cancellationPolicy.policies;
//       let policyLength = policies.length
//       policies.sort((a, b) => a.hours - b.hours);

//       for (let i = 0; i <= policyLength; i++) {
//         if (hourDifference >= policies[i].hours && hourDifference < policies[i + 1].hours) {
//           refundPercentage = policies[i].refundPersentage;
//           break;
//         }
//       }

//       function percentage(num, per) {
//         return (num / 100) * per;
//       }

//       let refundAmount = Math.ceil(percentage(totalAmount, refundPercentage));
//       let cancellationCharge = totalAmount - refundAmount;
//       refundBreakDown = {
//         percentage: refundPercentage,
//         refundAmount: refundAmount,
//         cancellationCharge: cancellationCharge
//       }
//       console.log(refundBreakDown);
//       booking.refundBreakDown = refundBreakDown;
//       refundAmount = refundAmount * 100;

//       let transactionDetails = await transaction.find({ referenceId: referenceId })


//       let paymentIntent = transactionDetails[0].paymentId;

//       const refund = await stripe.refunds.create({
//         payment_intent: paymentIntent,
//         amount: refundAmount
//       });

//       let cancelledTransaction = new transaction({
//         paymentIntent: transactionDetails[0].paymentIntent,
//         paymentId: transactionDetails[0].paymentId,
//         customer: transactionDetails[0].customer,
//         userId: transactionDetails[0].userId,
//         venueId: transactionDetails[0].venueId,
//         status: 5,
//         bookingId: transactionDetails[0].bookingId,
//         referenceId: transactionDetails[0].referenceId,
//         totalAmount: transactionDetails[0].totalAmount,
//         currency: transactionDetails[0].currency,
//         createdAt: currentDate,
//         refundBreakDown: refundBreakDown

//       })

//       if (refund.status == 'succeeded') {
//         booking.refundStatus = 3;
//         cancelledTransaction.status = 5;
//         cancelledTransaction.refundStatus = 3;
//       } else if (refund.status == 'failed') {
//         booking.refundStatus = 2;
//         cancelledTransaction.status = 5;
//         cancelledTransaction.refundStatus = 2;
//       } else {
//         booking.refundStatus = 1;
//         cancelledTransaction.status = 5;
//         cancelledTransaction.refundStatus = 1;
//       }
//       await cancelledTransaction.save();
//       await booking.save();
//     }
//     await booking.save()
//     //ends here
//     return res.send({ statusCode: 200, status: "Booking cancelled" });
//   }
//   catch (err) {
//     console.log(err)
//     return res.send({ statusCode: 500, status: "Something Went wrong" });
//   }

// }

exports.cancelBooking = async (req, res, next) => {
  if (!req.body.bookingId || req.body.bookingId == '') {
    return res.send({ statusCode: 500, status: "Valid 'bookingId' required" });
  }
  if (!req.body.refundOption || req.body.refundOption == '') {
    return res.send({ statusCode: 500, status: "Valid 'refundOption' required" });
  }
  let bookingId = req.body.bookingId;
  let refundOption = req.body.refundOption;
  let timeOffset = req.body.timeOffset;
  let booking;
  let bookings;
  let game;
  let updateGame;
  let refundBreakDown;
  const userId = req.body.userId;
  let refundCalculation;
  let bookingDate;
  let refundPercentage;
  const now = Date.now();
  let currentDate = dayjs().utc().format();

  try {
    booking = await pitchBooking.findById(bookingId)
      .populate({
        path: "venueId",
        select: "refundPolicy grounds pitches"
      })
      .populate({
        path: "venueOwner",
        select: "email"
      })
      .populate({
        path: "userId",
        select: "email name mobileNumber"
      })
      .populate({
        path: "pitchType",
        select:"surfaceName"
      });



    if (!booking) {
      return res.send({
        statusCode: 404,
        status: "No Booking available"
      });
    }

    if (booking.status !== 3) {
      return res.send({ statusCode: 500, status: "Cancellation Failed, cannot cancel a unsuccessful booking" });
    }

    const referenceId = booking.referenceId;
    let pitchId = booking.pitchId;
    let groundId = booking.groundId;
    let ground = booking.venueId.grounds
    let bookedGround = ground.find((e)=> e._id.toString() == groundId.toString())
    let pitches = bookedGround.pitches;
    let bookingDetail = booking.booking;

    booking.isCancelled = true;
    booking.cancelledAt = now;
    booking.cancelledBy = userId;
    booking.status = 5;

    if(booking.paymentOption == 1){
      booking.refundOption = refundOption;
    }

    let bookedPitch = pitches.filter((e) => e._id.toString() == pitchId.toString())
    

    for(item of bookingDetail){
    let date = item.date;
    let timeId = item.timeId;
    bookedPitch[0].children.forEach(async (pitchItem)=>{
       let existingPitchBlock = await pitchBlocking.find({
              groundId: groundId,
              pitchId: pitchItem.pitchId,
              "booking.date": date,
              "booking.timeSlots": { $in: timeId }
           })
        if(existingPitchBlock.length > 0){
            existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
            await existingPitchBlock[0].save();
           }
        if(existingPitchBlock[0].blockCount == 0){
            console.log(9)
            let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
            // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
           }
    })

      bookedPitch[0].parent.forEach(async (pitchItem)=>{
       let existingPitchBlock = await pitchBlocking.find({
              groundId: groundId,
              pitchId: pitchItem.pitchId,
              "booking.date": date,
              "booking.timeSlots": { $in: timeId }
           })
        if(existingPitchBlock.length > 0){
            existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
            await existingPitchBlock[0].save();
           }
        if(existingPitchBlock[0].blockCount == 0){
            console.log(9)
            let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
            // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
           }
    })

     let existingPitchBlock = await pitchBlocking.find({
              groundId: groundId,
              pitchId:  pitchId,
              "booking.date": date,
              "booking.timeSlots": { $in: timeId }
           })
        if(existingPitchBlock.length > 0){
            existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
            await existingPitchBlock[0].save();
           }
        if(existingPitchBlock[0].blockCount == 0){
            console.log(9)
            let pitchBlock = await pitchBlocking.deleteOne({pitchId: pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
            // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
           }
    

    // await pitchBlocking.deleteMany({ "booking.referenceId": referenceId });
    }
    if (booking.gameId) {
      let gameId = booking.gameId
      bookings = await pitchBooking.updateOne({ _id: bookingId }, { $unset: { gameId: "" } })

      //notification starts here
      game = await Game.findById(gameId)
   .populate({
    path: "gameMembers.userId",
    select: "name pushToken notificationEnabled active isDeleted",
  })

  let gameName = game.gameName;
  let message = `Cancelled the booked pitch  for ${gameName}`;
  let gameMembers = game.gameMembers;
  let createdBy = game.createdBy
  let gameMemberData;
  let type = "2";
  if(gameMembers.length){
    console.log("gamemembers")
    pushTokens = [];
    userPushTokens = [];
    gameMembers.forEach((member)=>{
      gameMemberData = member.userId;
      if(gameMemberData){
        console.log("name",gameMemberData.name)
        if(
          gameMemberData.notificationEnabled == true &&
        gameMemberData.pushToken.length &&
        gameMemberData.isDeleted != true
        ){
           if(userId.toString() !== gameMemberData._id.toString()){
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
      //ends here


      updateGame = await Game.updateOne({ _id: gameId }, { $unset: { bookingId: "" } })
      
    }

    //conditional check
    if (booking.paymentOption == 1) {
      let totalAmount = booking.totalAmount;
      let startingTime = timeRange.find((e) => e.id == booking.booking[0].timeId[0])
      startingTime = startingTime.from;
      if (booking.booking.length > 1) {
        let date1 = booking.booking[0].date;
        let date2 = booking.booking[1].date;
        if ((dayjs(date1).isAfter(dayjs(date2)))) {
          bookingDate = date2;
        } else {
          bookingDate = date1;
        }
      } else {
        bookingDate = booking.booking[0].date;
      }
      console.log(bookingDate, parseInt(timeOffset))
      let bookedDateTime = dayjs(`${bookingDate}T${startingTime}:00`,"YYYY-MM-DDTHHmmss").format('DD-MM-YYYYTHH:mm:ss')
      console.log(bookedDateTime)
      let DateTimeNow = dayjs().utcOffset(parseInt(timeOffset)).format('DD-MM-YYYYTHH:mm:ss');
      console.log(DateTimeNow)
      const date1 = dayjs(bookedDateTime, 'DD-MM-YYYYTHH:mm:ss')
      const date2 = dayjs(DateTimeNow, 'DD-MM-YYYYTHH:mm:ss')
      
      let hourDifference = date1.diff(date2,  'hour', true)
      console.log(hourDifference)
      let refundPolicyId = booking.venueId.refundPolicy._id;
      
      let cancellationPolicy = await refundPolicyModel.findById(refundPolicyId)
      console.log(cancellationPolicy)
      let policies = cancellationPolicy.policies;
      let zeroExist = policies.find((e)=>e.hours == 0)
      if(!zeroExist) {
        let zeroHourPolicy = {
          hours: 0,
          refundPersentage: 0
        };
        policies.splice(0, 0, zeroHourPolicy)
      }
      let yearPolicy = {
        hours: 8766
      };
      let length = policies.length
      policies.splice(length, 0, yearPolicy)    
      let policyLength = policies.length
      policies.sort((a, b) => a.hours - b.hours);

      for (let i = 0; i <= policyLength; i++) {
        if (hourDifference >= policies[i].hours && hourDifference < policies[i + 1].hours) {
          refundPercentage = policies[i].refundPersentage;
          break;
        }
      }

      function percentage(num, per) {
        return (num / 100) * per;
      }

      let refundAmount = Math.ceil(percentage(totalAmount, refundPercentage));
      let cancellationCharge = totalAmount - refundAmount;
      let cancellationPercentage = 100 - refundPercentage;
      refundBreakDown = {
        percentage: refundPercentage,
        cancellationPercentage: cancellationPercentage,
        refundAmount: refundAmount,
        cancellationCharge: cancellationCharge
      }
      console.log(refundBreakDown);
      booking.refundBreakDown = refundBreakDown;
      refundAmount = refundAmount * 100;

      let transactionDetails = await transaction.find({ referenceId: referenceId })

      if(refundAmount > 0){
        let paymentIntent = transactionDetails[0].paymentId;

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntent,
          amount: refundAmount
        });
      
        let cancelledTransaction = new transaction({
          paymentIntent: transactionDetails[0].paymentIntent,
          paymentId: transactionDetails[0].paymentId,
          customer: transactionDetails[0].customer,
          userId: transactionDetails[0].userId,
          venueId: transactionDetails[0].venueId,
          status: 5,
          bookingId: transactionDetails[0].bookingId,
          referenceId: transactionDetails[0].referenceId,
          totalAmount: transactionDetails[0].totalAmount,
          currency: transactionDetails[0].currency,
          createdAt: currentDate,
          refundBreakDown: refundBreakDown

        })

        if (refund.status == 'succeeded') {
          booking.refundStatus = 3;
          cancelledTransaction.status = 5;
          cancelledTransaction.refundStatus = 3;
        } else if (refund.status == 'failed') {
          booking.refundStatus = 2;
          cancelledTransaction.status = 5;
          cancelledTransaction.refundStatus = 2;
        } else {
          booking.refundStatus = 1;
          cancelledTransaction.status = 5;
          cancelledTransaction.refundStatus = 1;
        }
        await cancelledTransaction.save();
        await booking.save();
    }else{
        let cancelledTransaction = new transaction({
          paymentIntent: transactionDetails[0].paymentIntent,
          paymentId: transactionDetails[0].paymentId,
          customer: transactionDetails[0].customer,
          userId: transactionDetails[0].userId,
          venueId: transactionDetails[0].venueId,
          status: 5,
          bookingId: transactionDetails[0].bookingId,
          referenceId: transactionDetails[0].referenceId,
          totalAmount: transactionDetails[0].totalAmount,
          currency: transactionDetails[0].currency,
          createdAt: currentDate,
          refundBreakDown: refundBreakDown
        })
        booking.refundStatus = 3;
        cancelledTransaction.status = 5;
        cancelledTransaction.refundStatus = 3;
        await cancelledTransaction.save();
        await booking.save();
    }
    }
    await booking.save()
    let bookingDate1;
     let bookingDate2;
     let timeFrom;
     let timeTo;
     if (booking.booking.length > 1 && dayjs(booking.booking[0].date) > dayjs(booking.booking[1].date)) {
        bookingDate1 = booking.booking[1]
        bookingDate2 = booking.booking[0]
      }else if(booking.booking.length > 1 && dayjs(booking.booking[1].date) > dayjs(booking.booking[0].date)){
        bookingDate1 = booking.booking[0]
        bookingDate2 = booking.booking[1]
      }else{
        bookingDate1 = booking.booking[0]
      }

      if(bookingDate1 && bookingDate2){
        let len = bookingDate2.timeId.length
        timeFrom = bookingDate1.timeId[0]
        for (let i=0; i<len; i++){
          if(i== len - 1){
            timeTo = bookingDate2.timeId[i]
            console.log(timeTo)
          }
        }
      }else{
        console.log("condition1")
        timeFrom = bookingDate1.timeId[0]
        console.log(timeFrom)
        let len = bookingDate1.timeId.length
        console.log("len",len)
        for (let i=0; i<len; i++){
          if(i==len-1){
            console.log("condition2")
            timeTo = bookingDate1.timeId[i]
          }
      }
    }



    // let timeSlot = timeRange.find((e)=> e.id == booking.booking[0].timeId[0])
    let timeSlot1 = timeRange.find((e)=> e.id == timeFrom);
    let timeSlot2 =  timeRange.find((e)=> e.id == timeTo);
    if(booking.venueOwner.email){
      const reqAdminBody = {
        email: booking.venueOwner.email,
        data: {
          name: booking.userId.name,
          mobile: booking.userId.mobileNumber,
          bookingDate: bookingDate1.date,
          timeSlotFrom: timeSlot1.from,
          timeSlotTo: timeSlot2.to,
          venueName: booking.venueName,
          pitchType: booking.pitchType.surfaceName,
          cancelledAt: booking.cancelledAt,
          template: "userCancelledBooking"
        },
      };
      console.log(reqAdminBody)
    const apiAdminResponse = await getApi(
      apiURL.SEND_EMAIL,
      "POST",
      reqAdminBody
    ); //Email Send
    }
    //ends here
    return res.send({ statusCode: 200, status: "Booking cancelled" });
  }
  catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

}

exports.recentBooking = async (req, res, next) => {
  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let bookings;
  const userId = req.body.userId;
  console.log(userId);
  let result = [];
  let sort = {};
  sort["createdAt"] = -1;

  let today = new Date();


  console.log(today);
  const minutes = 30;
  const ms = 1000 * 60 * minutes;
  today = new Date(Math.ceil(today.getTime() / ms) * ms);
  let currentTime = `${today.getHours()}:${today.getMinutes()}`;

  try {

    bookings = await pitchBooking.find({ userId: userId })
      .select({
        venueId: 1,
        pitchId: 1,
        "booking.date": 1,
        pitchType: 1,
        pitchName: 1
      })
      .populate({
        path: "venueId",
        match: { isDeleted: { "$exists": false }},
        select: "name images location distance rating isPublished isBookable defaultImage"
      }).
      sort(sort);


    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2 - lat1);  // deg2rad below
      var dLon = deg2rad(lon2 - lon1);
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c; // Distance in km
      return d;
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180)
    }



    bookings.forEach((item) => {
      let index = result.findIndex(e => e.venueId._id == item.venueId._id)
      if(item.venueId){
      if (index == -1) {
        let newItem = item;
        let distance = getDistanceFromLatLonInKm(req.body.coordinates.lat, req.body.coordinates.lng, item.venueId.location.coordinates.lattitude, item.venueId.location.coordinates.longitude);
        distance = Math.round(distance);
        console.log("distance", distance);
        newItem.venueId.distance = distance;
        console.log(newItem);
        result.push(newItem)
      }
    }
    })




    if (bookings) {
      response = {
        statusCode: 200,
        data: {
          data: result,
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        games: [],
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.estimateBooking = async (req, res, next) => {

  let venueId = req.body.venueId;
  let totalAmount = req.body.totalAmount;
  let venues;

  venues = await venue.find({ _id: venueId })
    .select({
      name: 1
    })
    .populate({
      path: "country._id",
      select: "taxes"
    })

  function percentage(num, per) {
    return (num / 100) * per;
  }


  let taxes = venues[0].country._id.taxes;
  console.log(taxes);
  taxes.forEach((tax) => {
    totalAmount = totalAmount + percentage(totalAmount, tax.percentage)
  })

  console.log(totalAmount);


}

exports.linkGame = async (req, res, next) => {
  if (!req.body.bookingId || req.body.bookingId == '') {
    return res.send({ statusCode: 500, status: "Valid 'bookingId' required" });
  }
  if (!req.body.gameId || req.body.gameId == '') {
    return res.send({ statusCode: 500, status: "Valid 'gameId' required" });
  }
  let bookings;
  let game;
  let bookingId = req.body.bookingId;
  let gameId = req.body.gameId;
  let from = req.body.from;


  try {
    let verifyGame = await pitchBooking.find({ gameId: gameId });
    if (verifyGame.length > 0 && verifyGame[0].gameId) {
      if (from == "booking") {
        return res.send({
          statusCode: 404,
          status: "Game already linked"
        });
      } else {
        return res.send({
          statusCode: 404,
          status: "Booking already linked"
        });
      }
    }

    bookings = await pitchBooking.findById(bookingId);

    if (!bookings) {
      return res.send({
        statusCode: 404,
        status: "No Bookings available"
      });
    }

    if (bookings.gameId) {
      return res.send({
        statusCode: 404,
        status: "Booking already linked"
      });
    }

    bookings.gameId = gameId;

    game = await Game.findById(gameId);

    game.bookingId = bookingId;

    await bookings.save();
    await game.save();
    return res.send({ statusCode: 200, status: "Linked game with booking" });
  } catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

}

exports.unlinkGame = async (req, res, next) => {
  if (!req.body.bookingId || req.body.bookingId == '') {
    return res.send({ statusCode: 500, status: "Valid 'bookingId' required" });
  }
  if (!req.body.gameId || req.body.gameId == '') {
    return res.send({ statusCode: 500, status: "Valid 'gameId' required" });
  }
  let bookings;
  let bookingId = req.body.bookingId;
  let game;
  let gameId = req.body.gameId;

  try {
    bookings = await pitchBooking.updateOne({ _id: bookingId }, { $unset: { gameId: "" } })
    if (!bookings) {
      return res.send({
        statusCode: 404,
        status: "No Booking available"
      });
    }
    game = await Game.updateOne({ _id: gameId }, { $unset: { bookingId: "" } })
    return res.send({ statusCode: 200, status: "Unlinked game from Booking" });
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }

}

exports.availability = async (req, res, next) => {
  if (!req.body.venueId || req.body.venueId == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }
  const venueId = req.body.venueId;
  let venues;
  let finalResult = [];

  try {
    venues = await venue.aggregate([
      {
        $match: {
          "_id": Types.ObjectId(venueId)
        }
      }
    ]);


    if (venues[0]) {
      finalResult = venues[0].grounds.map((ground) => {
        let groundDetails = {
          _id: ground._id,
          name: ground.name
        }
        let pitchDetails = ground.pitches.map((pitch) => {
          let newpitch = {
            _id: pitch._id,
            name: pitch.name
          }
          let final = pitch.availability.map((available) => {
            let startingTime = null;
            let endingTime;
            let timeSlots = []
            available.availabilityChart.forEach((time, index) => {
              if (time.status == 0 && startingTime == null) {
                let timeData = timeRange.find(e => e.id == time.id)
                startingTime = timeData.from;
              }

              if (time.status == 0) {
                let timeData = timeRange.find(e => e.id == time.id)
                endingTime = timeData.to;
              }

              if (time.status == 2 || index == available.availabilityChart.length - 1) {
                if (startingTime != null && endingTime != null) {
                  timeSlots.push({
                    from: startingTime,
                    to: endingTime
                  })
                }
                startingTime = null
                endingTime = null
              }

            })
            return {
              title: available.group,
              timeSlots: timeSlots
            }
          })
          const unique = [...new Map(final.map(item => [item['title'], item])).values()];;
          newpitch.timeRanges = unique;
          return newpitch;
        })
        console.log(pitchDetails)
        groundDetails.pitches = pitchDetails
        return groundDetails;
      })
    }
    return res.send({ statusCode: 200, data: finalResult });
  } catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.getPolicy = async (req, res, next) => {
  if (!req.body.vid || req.body.vid == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }
  let venueId = req.body.vid;
  let policy;
  try {
    policy = await venue.findOne({ _id: venueId })
      .select({
        policies: 1
      })
    // .skip(limit * (pageNo - 1)
    if (policy) {
      response = {
        statusCode: 200,
        data: {
          data: policy
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        page: pageNo,
        reviews: [],
      };
    }

    return res.send(response);
  }
  catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
};

exports.createOrder = async (req, res, next) => {
  let booking;
  let transactions;
  let currentDate = dayjs().utc().format();
  const userId = req.body.userId;

  if (!req.body.bookingId) {
    return res.send({
      statusCode: 404,
      status: "bookingId cant be empty"
    });

  }
  let bookingId = req.body.bookingId;

  try {
    booking = await pitchBooking.findById(bookingId);

    let groundId = booking.groundId;
    let pitchId = booking.pitchId;
    let date = booking.booking[0].date;
    let timeId = booking.booking[0].timeId;
    let venueId = booking.venueId;
    let venueOwner = booking.venueOwner;

    let ownerBlock = await ownerBlockModel.find({
       groundId: groundId,
       pitchId: booking.pitchId,
       "booking.date": date,
       "booking.timeSlots": { $in: timeId }
    })

    if(ownerBlock.length > 0 ){
      return res.send({ statusCode: 403, status: "Failed to book this slot." });
    }

    let totalAmount = parseFloat(booking.totalAmount);
    totalAmount = totalAmount * 100
    totalAmount = Math.round((totalAmount + Number.EPSILON) * 100) / 100
    console.log("total", totalAmount)

    const customer = await stripe.customers.create({
      name: userId,
      address: {
        line1: userId,
        postal_code: userId,
        city: userId,
        state: userId,
        country: booking.countryShortcode,
      }
    });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2020-08-27' }
    );

    let body = {
      amount: totalAmount,
      currency: booking.currency,
      customer: customer.id,
      // automatic_payment_methods: {
      //   enabled: true,
      // },
      
      payment_method_types: ['card'],

    }
    const paymentIntent = await stripe.paymentIntents.create(body);

    transactions = new transaction({
      paymentIntent: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
      customer: customer.id,
      userId: userId,
      venueId: venueId,
      venueOwner: venueOwner,
      status: 1,
      bookingId: bookingId,
      referenceId: booking.referenceId,
      totalAmount: booking.totalAmount,
      currency: paymentIntent.currency,
      createdAt: currentDate
    })

    await transactions.save();

    res.send({
      statusCode: 200,
      data: {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customer.id,
        publishableKey: process.env.PUBLISHABLE_KEY
      }
    });
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.discountMatrix = async (req, res, next) => {
  if (!req.body.venueId || req.body.venueId == '') {
    return res.send({ statusCode: 500, status: "Valid 'venueId' required" });
  }
  let venueId = req.body.venueId;
  let venues;

  try {
    venues = await venue.findById(venueId)
      .select({
        offers: 1,
        grounds: 1
      })

    let venueOffers = venues.offers;

    let finalResult = venues.grounds.map((ground) => {
      console.log("ground", ground._id)
      let groundOffers = {
        _id: ground._id,
        offer: ground.offers
      }
      let pitch = ground.pitches.map((pitch) => {
        console.log("pitches", pitch._id)
        let pitchoffers = {
          _id: pitch._id,
          offer: pitch.offers
        }
        console.log(pitchoffers)

        let slots = pitch.price.map((price) => {
          // console.log("title",price.title)
          let offers;
          let startingTime = null;
          let endingTime;
          // here already foreach no need to change
          price.timeRange.map((time) => {
            // console.log(time.id)
            if (time.offer.length) {
              // console.log(time.offer)
              let timeData = timeRange.find(e => e.id == time.id)
              if (startingTime == null) {
                console.log(1111111);
                startingTime = timeData.from;
                offers = time.offer;
              }

              // if(time.offer.length){
              console.log(222222);
              // let timeData = timeRange.find(e => e.id == time.id)
              endingTime = timeData.to;
              // }

              // if(startingTime != null){
              //   return{
              //     offers: offers,
              //     timeSlots: [{
              //       from: startingTime,
              //       to: endingTime
              //     }]
              //   }
              // }
            }
          })
          if (startingTime != null) {
            return {
              offers: offers,
              timeSlots: [{
                from: startingTime,
                to: endingTime
              }]
            }
          }
          // return slotsoffer;
        })
        // console.log(slots)
        pitchoffers.slotOffers = slots;
        return pitchoffers;
      })
      groundOffers.pitches = pitch;
      console.log(groundOffers)
      return groundOffers;
    })

    let offers = {
      venue: venueOffers,
      ground: finalResult
    }

    return res.send({ statusCode: 200, data: offers });
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.offerList = async (req, res, next) => {
  if (!req.body.coordinates) {
    return res.send({
      statusCode: 404,
      status: "coordinates required"
    });
  }
  let venues;
  let offers = [];
  let query = {};
  let text;

  if (req.body) {
    const coordinates = [req.body.coordinates.lng, req.body.coordinates.lat]
    query["location"] = { $near: { $geometry: { type: "Point", coordinates: coordinates } } }
    // query["location"] = { $nearSphere: { $geometry: { type: "Point", coordinates: coordinates }, $maxDistance: 300000 } }
    query["offers"] = { $exists: true }
    query["isPublished"] = { $eq: true }
  }


  if (req.body.search) {
    text = req.body.search.toString();
    // query["offers.name"] = { $regex: new RegExp(text, "i") }
    // query["name"] = { $regex: new RegExp(text, "i") }

    query = {
      $and: [
        {
          $or: [
            { "name": { $regex: new RegExp(text, "i") } },
            { "offers.name": { $regex: new RegExp(text, "i") } }
          ]
        },
        {
          "isPublished": { $eq: true }
        }
      ]

      //  { $or: [
      //     { "name": { $regex: new RegExp(text, "i") } },
      //     { "offers.name":{ $regex: new RegExp(text, "i") } }
      //   ]}
    }
  }

  console.log(query);

  try {
    venues = await venue.find(query)
      .select({
        offers: 1,
        name: 1
      })
      .populate({
        path: "offers._id",
        select: "name type offer date offerType days description image"
      })


    venues.forEach((venue) => {
      let venueId = venue._id;
      let venueName = venue.name;
      venue.offers.forEach((offer) => {
        if (req.body.search) {
          if (offer._id.name.match(text)) {
            let offerObject = {
              name: offer._id.name,
              image: offer._id.image,
              type: offer._id.type,
              offer: offer._id.offer,
              date: offer._id.date,
              days: offer._id.days,
              offerType: offer._id.offerType,
              venueId: venueId,
              venue: venueName,
              description: offer._id.description
            }
            offers.push(offerObject)
          } else if (venueName.match(text)) {
            let offerObject = {
              name: offer._id.name,
              image: offer._id.image,
              type: offer._id.type,
              offer: offer._id.offer,
              date: offer._id.date,
              days: offer._id.days,
              offerType: offer._id.offerType,
              venueId: venueId,
              venue: venueName,
              description: offer._id.description
            }
            offers.push(offerObject)
          }
        } else {
          let offerObject = {
            name: offer._id.name,
            image: offer._id.image,
            type: offer._id.type,
            offer: offer._id.offer,
            date: offer._id.date,
            days: offer._id.days,
            offerType: offer._id.offerType,
            venueId: venueId,
            venue: venueName,
            description: offer._id.description
          }
          offers.push(offerObject)
        }
      })
    })



    if (offers) {
      response = {
        statusCode: 200,
        data: {
          data: offers
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        page: pageNo,
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.updateStatus = async (req, res, next) => {
  if (!req.body.bookingStatus || req.body.bookingStatus == '') {
    return res.send({ statusCode: 500, status: "Valid 'bookingStatus' required" });
  }
  if (!req.body.bookingId || req.body.bookingId == '') {
    return res.send({ statusCode: 500, status: "Valid 'referenceId' required" });
  }

  let paymentOption = req.body.paymentOption;
  let bookingStatus = req.body.bookingStatus;
  let bookingComment = req.body.comment;
  let booking;
  let blocking;
  let payment;
  let referenceId = req.body.referenceId;
  let bookingId = req.body.bookingId;
  
  
  let ground;
  let bookedGround;
  let pitches;
  let bookingDetail;
  let bookedPitch;

  if (!referenceId) {
    return res.send({
      statusCode: 404,
      status: "No RefrenceId"
    });
  }


  try {
    booking = await pitchBooking.findById(bookingId)
    .populate({
      path: "userId",
      select: "email name mobileNumber"
    })
    .populate({
      path: "venueOwner",
      select: "email"
    })
    .populate({
      path: "pitchType",
      select:"surfaceName"
    })
    .populate({
        path: "venueId",
        select: "grounds pitches"
      })


    let groundId = booking.groundId;
    let pitchId = booking.pitchId;
    let date = booking.booking[0].date;
    let timeId = booking.booking[0].timeId;

    let ownerBlock = await ownerBlockModel.find({
       groundId: groundId,
       pitchId: booking.pitchId,
       "booking.date": date,
       "booking.timeSlots": { $in: timeId }
    })

    if(ownerBlock.length > 0 ){
      ground = booking.venueId.grounds
        bookedGround = ground.find((e)=> e._id.toString() == groundId.toString())
        pitches = bookedGround.pitches;
        bookingDetail = booking.booking;
        booking.status = bookingStatus;
        bookedPitch = pitches.filter((e) => e._id.toString() == pitchId.toString())
        for(item of bookingDetail){
          let date = item.date;
          let timeId = item.timeId;
          bookedPitch[0].children.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
            bookedPitch[0].parent.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
           let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId:  pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId: pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          }
        
      return res.send({ statusCode: 403, status: "Failed to book this slot." });
    }


    blocking = await pitchBlocking.find({ "booking.referenceId": referenceId })

    if (!booking) {
      return res.send({
        statusCode: 404,
        status: "No Booking"
      });
    }

    switch (bookingStatus) {
      case 3:
        booking.status = bookingStatus;
        booking.paymentOption = paymentOption;
        booking.comments = bookingComment;
        blocking.forEach(async (block) => {
          block.confirmation = true;
          await block.save();
        })
        if(paymentOption == 1){
          payment = "Online"
        }else{
          payment = "Pay at Venue"
        }
        let bookingDate1;
        let bookingDate2;
        let timeFrom;
        let timeTo;
        if (booking.booking.length > 1 && dayjs(booking.booking[0].date) > dayjs(booking.booking[1].date)) {
            bookingDate1 = booking.booking[1]
            bookingDate2 = booking.booking[0]
          }else if(booking.booking.length > 1 && dayjs(booking.booking[1].date) > dayjs(booking.booking[0].date)){
            bookingDate1 = booking.booking[0]
            bookingDate2 = booking.booking[1]
          }else{
            bookingDate1 = booking.booking[0]
          }

          if(bookingDate1 && bookingDate2){
            let len = bookingDate2.timeId.length
            timeFrom = bookingDate1.timeId[0]
            for (let i=0; i<len; i++){
              if(i== len - 1){
                timeTo = bookingDate2.timeId[i]
                console.log(timeTo)
              }
            }
          }else{
            console.log("condition1")
            timeFrom = bookingDate1.timeId[0]
            console.log(timeFrom)
            let len = bookingDate1.timeId.length
            console.log("len",len)
            for (let i=0; i<len; i++){
              if(i==len-1){
                console.log("condition2")
                timeTo = bookingDate1.timeId[i]
              }
          }
        }



        // let timeSlot = timeRange.find((e)=> e.id == booking.booking[0].timeId[0])
        let timeSlot1 = timeRange.find((e)=> e.id == timeFrom);
        let timeSlot2 =  timeRange.find((e)=> e.id == timeTo);
        if(booking.userId.email){
          const reqBody = {
            email: booking.userId.email,
            data: {
              name: booking.userId.name,
              mobile: booking.userId.mobileNumber,
              bookingDate: bookingDate1.date,
              timeSlotFrom: timeSlot1.from,
              timeSlotTo: timeSlot2.to,
              venueName: booking.venueName,
              pitchType: booking.pitchType.surfaceName,
              paymentOption: payment,
              totalAmount: booking.totalAmount,
              currency: booking.currency,
              createdAt: booking.createdAt,
              referenceId: referenceId,
              pitchSize: booking.pitchName,
              template: "bookingSuccessUser"
            },
          };

          const apiResponse = await getApi(apiURL.SEND_EMAIL, "POST", reqBody); //Email Send
        }
        if(booking.venueOwner.email){
          const reqAdminBody = {
            email: booking.venueOwner.email,
            data: {
              name: booking.userId.name,
              mobile: booking.userId.mobileNumber,
              bookingDate: bookingDate1.date,
              timeSlotFrom: timeSlot1.from,
              timeSlotTo: timeSlot2.to,
              venueName: booking.venueName,
              pitchType: booking.pitchType.surfaceName,
              paymentOption: payment,
              totalAmount: booking.totalAmount,
              currency: booking.currency,
              createdAt: booking.createdAt,
              template: "bookingSuccess"
            },
          };
        const apiAdminResponse = await getApi(
          apiURL.SEND_EMAIL,
          "POST",
          reqAdminBody
        ); //Email Send
        }
        break;

      case 4:
        ground = booking.venueId.grounds
        bookedGround = ground.find((e)=> e._id.toString() == groundId.toString())
        pitches = bookedGround.pitches;
        bookingDetail = booking.booking;
        booking.status = bookingStatus;
        booking.paymentOption = paymentOption
        bookedPitch = pitches.filter((e) => e._id.toString() == pitchId.toString())
        for(item of bookingDetail){
          let date = item.date;
          let timeId = item.timeId;
          bookedPitch[0].children.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
            bookedPitch[0].parent.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
           let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId:  pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId: pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          
      
          // await pitchBlocking.deleteMany({ "booking.referenceId": referenceId });
          }
        // blocking = await pitchBlocking.remove({ "booking.referenceId": referenceId })
        break;

      case 5:
        console.log("cancelled  case")
        ground = booking.venueId.grounds
        bookedGround = ground.find((e)=> e._id.toString() == groundId.toString())
        pitches = bookedGround.pitches;
        bookingDetail = booking.booking;
        booking.status = bookingStatus;
        bookedPitch = pitches.filter((e) => e._id.toString() == pitchId.toString())
        for(item of bookingDetail){
          let date = item.date;
          let timeId = item.timeId;
          bookedPitch[0].children.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
            bookedPitch[0].parent.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
           let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId:  pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId: pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          
      
          // await pitchBlocking.deleteMany({ "booking.referenceId": referenceId });
          }
        // blocking = await pitchBlocking.remove({ "booking.referenceId": referenceId })
        break;

      case 6:
        console.log("aborted case")
        ground = booking.venueId.grounds
        bookedGround = ground.find((e)=> e._id.toString() == groundId.toString())
        pitches = bookedGround.pitches;
        bookingDetail = booking.booking;
        booking.status = bookingStatus;
        bookedPitch = pitches.filter((e) => e._id.toString() == pitchId.toString())
        for(item of bookingDetail){
          let date = item.date;
          let timeId = item.timeId;
          bookedPitch[0].children.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
            bookedPitch[0].parent.forEach(async (pitchItem)=>{
             let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId: pitchItem.pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          })
      
           let existingPitchBlock = await pitchBlocking.find({
                    groundId: groundId,
                    pitchId:  pitchId,
                    "booking.date": date,
                    "booking.timeSlots": { $in: timeId }
                 })
              if(existingPitchBlock.length > 0){
                  existingPitchBlock[0].blockCount = existingPitchBlock[0].blockCount - 1;
                  await existingPitchBlock[0].save();
                 }
              if(existingPitchBlock[0].blockCount == 0){
                  console.log(9)
                  let pitchBlock = await pitchBlocking.deleteOne({pitchId: pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                  // let blocking = await pitchBlocking.deleteOne({pitchId:pitchItem.pitchId, "booking.date": date,"booking.timeSlots": { $in: timeId }})
                 }
          
      
          // await pitchBlocking.deleteMany({ "booking.referenceId": referenceId });
          }
        // blocking = await pitchBlocking.remove({ "booking.referenceId": referenceId });
        break;

      default:
        booking.status = bookingStatus;
    }

    if (paymentOption == 0) {
      await transaction.remove({ bookingId: bookingId });
    }

    await transaction.updateOne({ bookingId: bookingId }, { $set: { status: bookingStatus } })

    await booking.save();
    return res.send({
      statusCode: 200,
      data: { response: "status updated" }
    })
  } catch (err) {
    console.log(err)
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }


}

exports.transactionList = async (req, res, next) => {
  if (!req.body.userId || req.body.userId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let transactions;
  const userId = req.body.userId;
  let sort = {};
  sort["createdAt"] = -1;

  try {
    transactions = await transaction.find({ userId: userId, status: { $in: [2, 3, 4, 5] } })
      .sort(sort);

    if (transactions) {
      response = {
        statusCode: 200,
        data: {
          data: transactions
        },
      };
    } else {
      response = {
        message: "No Result",
        total: 0,
        pages: 0,
        page: pageNo,
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}

exports.refundPolicyList = async (req, res, next) => {
  if (!req.body.venueId || req.body.venueId == '') {
    return res.send({ statusCode: 500, status: "Valid 'userId' required" });
  }
  let refundPolicyList;
  let venueId = req.body.venueId;
  try {
    refundPolicyList = await venue.findById(venueId)
      .select({
        refundPolicy:1
      })
      .populate({
        path:"refundPolicy",
        select:"policyName policies status"
      })
    if (refundPolicyModel) {
      response = {
        statusCode: 200,
        data: {
          data: refundPolicyList
        },
      };
    } else {
      response = {
        message: "No Result",
      };
    }

    return res.send(response);
  } catch (err) {
    console.log(err);
    return res.send({ statusCode: 500, status: "Something Went wrong" });
  }
}


