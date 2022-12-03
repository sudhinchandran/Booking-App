const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const pitchArray = new Schema({
    pitchId: {type: mongoose.Types.ObjectId},
    size: {type: Number}
},{ _id: false })

const timeRangeSchema = new Schema(
{
    id: { type: Number},
    price: { type: Number},
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
        price: {
            type: [timeRangeSchema],
        },
        pitchSize: { type: Number}
    },
);

module.exports = mongoose.model("specialPrice", specialPriceSchema, "app.specialPrice")