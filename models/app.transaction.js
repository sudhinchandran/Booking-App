const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  paymentIntent: {type:String},
  paymentId: {type:String},
  userId:  { type: mongoose.Types.ObjectId, ref: "appuser"},
  venueId: { type: mongoose.Types.ObjectId, ref: "venue" },
  venueOwner: {type: mongoose.Types.ObjectId, ref: "owner"},
  customer: {type:String},
  status:{ type: Number},
  refundStatus: { type: Number},
  totalAmount:  { type: Number },
  currency: {type: String},
  referenceId: { type: String},
  bookingId: { type: mongoose.Types.ObjectId, ref: "pitchBooking" },
  createdAt: { type: Date},
  refundBreakDown:{
    percentage:{type:Number},
    refundAmount:{type:Number},
    cancellationCharge: {type:Number}
  }
});

module.exports = mongoose.model("transaction", transactionSchema, "app.transaction");
