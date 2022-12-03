const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const referredGroundSchema = new Schema({
  groundName: { type: String},
  location: { type: String},
  email : { type: String },
  contact: { type: String },
  details : { type: String },
  userId: { type: mongoose.Types.ObjectId, ref: "appuser"},
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("referredGround", referredGroundSchema, "app.referredGround");
