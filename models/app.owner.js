const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const offersSchema = new Schema(
    {
      name: { type: String},
      image: {type: String},
      description: {type: String},
      type: { type: Number},
      offer: { type: Number },
      owner: { type: Number },
      offerType:{ type: Number},
      days: { type: Array},
      date: { 
        startDate: {type:String},
        endDate: {type:String}
       }
    }
  )

const ownerSchema = new Schema({
    // dialCode: { type: String, required: true, ref: "country" },
    mobileNumber: { type: String, required: true },
    name: { type: String },
    // createdAt: { type: Date },
    // updatedAt: { type: Date, default: Date.now },
    location: { type: String },
    //   location: { type: Object },
    email: { type: String },
    // isDisabled: { type: Boolean },
    // isDeleted: { type: Boolean },
    // deletedAt: { type: Date },
    // lastActiveAt: { type: Date },
    password: { type: String },
    status: {type:Number},
    venueCount: {type:Number},
    isDeleted:{type: Boolean},
    offers: {
        type:[offersSchema]
    }
});

// ownerSchema.index({ mobileNumber: 1, dialCode: 1 }, { unique: true });
// ownerSchema.index({ password: 1 }, { unique: true });
// ownerSchema.plugin(uniqueValidator, {
//   message: "Mobile Number already exists.",
// });

module.exports = mongoose.model("owner", ownerSchema, "app.owner");
