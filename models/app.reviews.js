const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");


const Schema = mongoose.Schema;

const reviewsSchema = new Schema(
    {
      userId: { type: mongoose.Types.ObjectId, ref: "appuser" },
      venueId: {type: mongoose.Types.ObjectId, ref: "venue"},
      name: { type: String },
      profileImage: { type: String },
      content: { type: String },
      rating: { type: Number },
      time: { type: Date },
      isDeleted: {type:Boolean}
    }
  )


  module.exports = mongoose.model("reviews", reviewsSchema, "app.reviews")