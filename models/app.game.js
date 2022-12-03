const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const gameMemberSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "appuser" },
    status: { type: Number },
    position: { type: Number },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const appGameSchema = new Schema({
  gameName: { type: String },
  placeId: { type: String },
  placeName: { type: String },
  address: { type: String },
  location: {
    type: { type: String },
    coordinates: [Number],
  },
  bookingId: { type: mongoose.Types.ObjectId, ref: "booking" },
  currency: { type: String },
  pitchCost: { type: String },
  pitchType: { type: String },
  playersPerSide: { type: Number },
  minimumPlayers: { type: Number },
  gameDate: { type: Date },
  gameMembers: {
    type: [gameMemberSchema],
  },
  gameOn: { type: Boolean },
  gameOnAt: { type: Date },
  teams: [{ type: mongoose.Types.ObjectId, ref: "team" }],
  createdBy: { type: mongoose.Types.ObjectId, ref: "appuser" },
  createdAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
  active: { type: Boolean },
  pushSended: { type: Boolean },
  isDeleted: { type: Boolean },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Types.ObjectId, ref: "appuser" },
});

appGameSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("game", appGameSchema, "app.game");
