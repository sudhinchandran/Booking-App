const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pitchBlockingSchema = new Schema({
    venueId: { type: mongoose.Types.ObjectId, ref: "venue" },
    groundId: { type: mongoose.Types.ObjectId, ref: "venue" },
    pitchId: { type: mongoose.Types.ObjectId, ref: "venue" },
    type: { type: Number },
    blockCount: { type: Number },
    booking: {
        timeSlots: { type: Array},
        date: { type: String},
        referenceId: { type: String}
      },
    confirmation: { 
      type: Boolean,
      default:false,
      index:true
    },
    createdAt: { type: Date},


})

pitchBlockingSchema.index({createdAt:1},{expireAfterSeconds: 300,partialFilterExpression : {confirmation: false}})

module.exports = mongoose.model("pitchBlocking", pitchBlockingSchema, "app.pitchBlocking");
