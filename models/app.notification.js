const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const appNotificationSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String },
  mobileNumber: { type: String },
  userId: { type: mongoose.Types.ObjectId, ref: "appuser" },
  teamId: { type: mongoose.Types.ObjectId, ref: "team" },
  gameId: { type: mongoose.Types.ObjectId, ref: "game" },
  gameDate: { type: Date },
  createdBy: { type: mongoose.Types.ObjectId, ref: "appuser" },
  createdAt: { type: Date },
  active: { type: Boolean },
  read: { type: Boolean },
  isViewed: { type: Boolean },
  isDeleted: { type: Boolean },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Types.ObjectId, ref: "appuser" },
});

module.exports = mongoose.model(
  "notification",
  appNotificationSchema,
  "app.notification"
);
