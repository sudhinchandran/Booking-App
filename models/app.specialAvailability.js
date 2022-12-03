const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const pitchArray = new Schema({
    pitchId: {type: mongoose.Types.ObjectId},
},{ _id: false })

const timeRangeSchema = new Schema(
{
    id: { type: Number},
    status: { type: Number},
},
{ _id: false }
);

const specialPriceSchema = new Schema(
    {
        venueId: { type: mongoose.Types.ObjectId },
        groundId: { type: mongoose.Types.ObjectId },
        date: { type: String},
        pitches: {
            type: [pitchArray]
        },
        availability: {
            type: [timeRangeSchema],
        },
        pitchSize: { type: Number}
    },
);

module.exports = mongoose.model("specialAvailability", specialPriceSchema, "app.specialAvailability")