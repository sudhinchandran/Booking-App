const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  date: { type: Date},
  mode: { type: String},
  type: { type: String},
  amount: { type: String},
  bookedUnits: { type: Number}
})

const bookSchema = new Schema({
  timeId: { type: Array},
  dayId: { type: Number },
  date: { type: String},
  pitchId: {type: mongoose.Types.ObjectId}
})

const pitchBookingSchema = new Schema({
  venueId: { type: mongoose.Types.ObjectId, ref: "venue" },
  groundId: { type: mongoose.Types.ObjectId, ref: "venue" },
  pitchId: { type: mongoose.Types.ObjectId, ref: "venue" },
  gameId: { type: mongoose.Types.ObjectId, ref: "game" },
  userId: { type: mongoose.Types.ObjectId, ref: "appuser"},
  venueOwner: {type: mongoose.Types.ObjectId, ref: "owner"},
  venueName: { type: String},
  pitchName: { type:String},
  pitchSize: {type: Number},
  pitchType:{type: mongoose.Types.ObjectId, ref: "surfaces"},
  referenceId: { type: String },
  booking: { type: [bookSchema]},
  totalAmount: { type: Number},
  currency: {type: String},
  countryShortcode: {type: String},
  country: {type:String},
  paidAmount: { type: String},
  comments: { type: String },
  isCancelled: { type: Boolean},
  cancelledAt: { type: Date},
  createdAt: { type: Date},
  status: {type: Number},
  isOnline: { type:Boolean},
  paymentOption : { type: Number },
  cancelledBy:  { type: mongoose.Types.ObjectId, ref: "appuser" },
  cancelledByAdmin: { type : Boolean },
  cancelledByPitchManager: { type : Boolean },
  refundOption: { type: Number },
  payments: {
    type : [paymentSchema],
  },
  createdBy: { type: mongoose.Types.ObjectId, ref: "appuser" },
  pushSended: { type: Boolean},
  gamePushSended: {type: Boolean},
  successEmailSended: {type: Boolean},
  adminCancelledEmailSended: {type: Boolean},
  userCancelledEmailSended: {type: Boolean},
  amountBreakDown: {
    pitchPriceTotal: {type:Number},
    taxes:[
      {
        name:{type:String},
        type:{type:Number},
        percentage:{type:Number},
        amount:{type:Number}
      }
    ],
    offerDiscounts:[{
      name:{type:String},
      percentage:{type:Number}
    }
    ],
    totalDiscountAmount:{type:Number},
    totalAmount:{type:Number}
  },
  refundBreakDown:{
    percentage:{type:Number},
    refundAmount:{type:Number},
    cancellationPercentage: {type:Number},
    cancellationCharge: {type:Number}
  }
});

module.exports = mongoose.model("pitchBooking", pitchBookingSchema, "app.pitchBooking");
