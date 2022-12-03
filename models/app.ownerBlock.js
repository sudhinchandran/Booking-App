const mongoose = require("mongoose");

const Schema = mongoose.Schema;


const ownerBlockSchema = new Schema(
    {
        // refId: { type: mongoose.Types.ObjectId},
        pitchId: { type: mongoose.Types.ObjectId, ref: "venue"},
        venueId: { type: mongoose.Types.ObjectId, ref: "venue"},
        groundId: { type: mongoose.Types.ObjectId, ref: "venue"},
        pitchUnit: {type: Number},
        booking: {
            timeSlots: { type: Array},
            date: { type: String}
          },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
        isDeleted: {type: Boolean}
    },
);

module.exports = mongoose.model("ownerBlock", ownerBlockSchema, "app.ownerBlock")