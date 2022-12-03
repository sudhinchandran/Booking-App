const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quickLinksSchema = new Schema({
  title: { type: String},
  bg_color: { type: String},
  device: { type: String },
  linkTo: { type: String },
  icon: { type: String }
});

module.exports = mongoose.model("quickLinks", quickLinksSchema, "app.quickLinks");
