const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const venueAvailabilitySchema = new Schema({
    venueId: { type: mongoose.Types.ObjectId, ref: "venue" },
    date: { type: String},
    timeRange: { type: Array},
    isCompleted: { type:Boolean }
})


module.exports = mongoose.model("venueAvailability", venueAvailabilitySchema, "app.venueAvailability");
