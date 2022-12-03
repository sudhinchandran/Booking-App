const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const appUserSchema = new Schema({
  dialCode: { type: String, required: true, ref: "country" },
  mobileNumber: { type: String, required: true },
  name: { type: String },
  language: { type: String },
  profileImage: { type: String },
  position: { type: String },
  level: { type: String },
  location: { type: String },
  footballClub: {
    name: { type: String },
    id: { type: String },
  },
  footballTeam: { type: String , ref:"country" },
  countryCode: { type: String },
  currency: { type: String },
  pushToken: { type: Array },
  createdAt: { type: Date },
  updatedAt: { type: Date, default: Date.now },
  active: { type: Boolean },
  referralCode: { type: String },
  placeId: { type: String },
  address: { type: Object },
  coordinates: { type: Object },
  contacts: { type: Array },
  email: { type: String },
  notificationEnabled: { type: Boolean },
  chatEnabled: { type: Boolean },
  chatNotification: { type: Boolean },
  isDisabled: { type: Boolean },
  isDeleted: { type: Boolean },
  deletedAt: { type: Date },
  lastActiveAt: { type: Date },
  pushSended: { type: Boolean },
  pushSendDate: { type: Date },
});

appUserSchema.index({ mobileNumber: 1, dialCode: 1 }, { unique: true });
appUserSchema.index({ referralCode: 1 }, { unique: true });
appUserSchema.plugin(uniqueValidator, {
  message: "Mobile Number already exists.",
});

module.exports = mongoose.model("appuser", appUserSchema, "app.user");
