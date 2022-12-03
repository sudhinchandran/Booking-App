const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const unavilabilitySchema = new Schema(
    {
        ownerId: { type: mongoose.Types.ObjectId, ref: "owner"},
        venueId: { type: mongoose.Types.ObjectId, ref: "venue"},
        groundId: { type: mongoose.Types.ObjectId, ref: "venue"},
        type: { type: Number },
        from: { type: String },
        to: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
    },
);

module.exports = mongoose.model("unavailability", unavilabilitySchema, "app.unavailability")