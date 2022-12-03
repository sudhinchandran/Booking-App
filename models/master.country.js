const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const taxesSchema = new Schema({
  name: {type: String},
  percentage: {type: Number}
})

const countrySchema = new Schema({
  counter: { type: Number },
  shortcode: { type: String, required: true },
  country: { type: String, required: true },
  en: { type: String, required: true },
  fr: { type: String },
  mobile_dialcode: { type: String },
  taxes:{
    type: [taxesSchema],
  },
  country_flag: { type: String },
  image_path: { type: String },
  team_status: { type: Boolean },
  team_flag: { type: String },
  currency: { type: String },
  active: { type: Boolean },
});

countrySchema.index({ shortcode: 1 }, { unique: true });
countrySchema.index({ counter: 1 }, { unique: true });
countrySchema.plugin(uniqueValidator, {
  message: "Invalid Data",
});

module.exports = mongoose.model("country", countrySchema, "master.country");
