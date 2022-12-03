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
      isExpired: {type: Boolean},
      isDeleted: {type: Boolean},
      status: {type: Number},
      venueId: {type: mongoose.Types.ObjectId, ref: "venue"},
      groundId: {type: mongoose.Types.ObjectId, ref: "venue"},
      ownerId: {type: mongoose.Types.ObjectId, ref: "owner"},
      date: { 
        startDate: {type:String},
        endDate: {type:String}
       },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    }
    
  )

module.exports = mongoose.model("offers", offersSchema, "app.offers");