const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");


const Schema = mongoose.Schema;


const timeRangeSchema = new Schema(
  {
    id: { type: Number},
    price: { type: Number},
    status: {type: Number},
    offers: [
      {
        _id: {type: mongoose.Types.ObjectId, ref: "offers"}
      }
    ],
  },
  { _id: false }
);

const timeAvailabilitySchema = new Schema(
  {
    id: { type: Number},
    status: {type: Number},
  },
  { _id: false }
);

const priceSchema = new Schema(
  {
    group:{ type: String},
    day: { type: Number}, 
    timeRange: {
      type: [timeRangeSchema]
    },
    priceChart: {type:Array}
  },
  { _id: false }
)

const availabilitySchema = new Schema(
  {
    group:{ type: String},
    day: { type: Number}, 
    availabilityChart: {
      type: [timeAvailabilitySchema]
    }
  },
  { _id: false }
)

const parentSchema = new Schema({
  pitchId: { type: mongoose.Types.ObjectId}
})

const childrenSchema = new Schema({
  pitchId: { type: mongoose.Types.ObjectId}
})

const groundsSchema = new Schema(
 {
      name: { type: String},
      type: {type: mongoose.Types.ObjectId, ref: "surfaces"},
      surfaceName: { type: String },
      surfaceColor: { type: String },
      materType: { type: mongoose.Types.ObjectId},
      offers: [
        {
          _id: {type: mongoose.Types.ObjectId, ref: "offers"}
        }
      ],
      pitches: [{
        type: {type: mongoose.Types.ObjectId, ref: "surfaces"},
        count: { type: Number },
        name: { type: String },
        offers: [
          {
            _id: {type: mongoose.Types.ObjectId, ref: "offers"}
          }
        ],
        isMaster: { type: Boolean },
        parent: {
          type: [parentSchema]
        },
        children: {
          type: [childrenSchema]
        },
        price: {
          type: [priceSchema],
        },
        availability: {
          type: [availabilitySchema],
        }
      }]
    }
)

const policiesSchema = new Schema(
  {
    title : { type: String },
    content: { type: String}
  }
)


const appVenueSchema = new Schema(
  {
    name: { type: String },
    description: { type: String },
    startingPrice: { type: Number},
    paymentOptions: { type: Array },
    isBookable: { type:Boolean },
    surfaces: {type:Array},
    owner: {type: mongoose.Types.ObjectId, ref: "owner"},
    offers: [
      {
        _id: {type: mongoose.Types.ObjectId, ref: "offers"}
      }
    ],
    distance: { type: Number },
    images: [
      {
      uri:{type: String},
      isDefault:{type:Boolean}
    }
  ],
  defaultImage:{
    uri: {type:String}
  },
    location: {
      type : { type: String },
      name : { type: String },
      city : { type: String },
      country : { type: String },
      countryCode: {type: String},
      state : { type: String },
      coordinates : {
        longitude: { type: Number },  
        lattitude: { type: Number }
      }
    },
    timeZone:{
      zone:{type:String},
      GMT:{type:String},
      currentDateTime:{type:String}
    },
    rating: { type: Number },
    reviews: [
      {
        _id: {type: mongoose.Types.ObjectId, ref: "reviews"}
      }
    ],
    highlights: [
      {
        _id: {type: mongoose.Types.ObjectId, ref: "highlights"}
      }
    ],
    taxes: [
      {
        _id: {type: mongoose.Types.ObjectId, ref: "taxes"}
      }
    ],
    grounds: {
      type : [groundsSchema],
    },
    discount: {
      status: { type: Boolean},
      type: { type: Number },
      value: { type: String }
    },
    contacts: {
      email : { type: String },
      phone: { type: String}
    },
    totalBookings: { type: Number },
    policies: {
      type : [policiesSchema],
    },
    country: {
      _id: {type: mongoose.Types.ObjectId ,ref: "country"},
      discountId:  {type: mongoose.Types.ObjectId},
      discountName: { type: String }
    },
    state: {
      _id: {type: mongoose.Types.ObjectId},
      discountId:  {type: mongoose.Types.ObjectId},
      discountName: { type: String }
    },
    city: {
      _id: {type: mongoose.Types.ObjectId},
      discountId:  {type: mongoose.Types.ObjectId},
      discountName: { type: String }
    },

    createdBy: { type: String },
    createdAt: { type: String },  
    totalReviews: { type: Number },
    refundPolicy: {type: mongoose.Types.ObjectId ,ref: "refundPolicy"},
    isDeleted: {type:Boolean},
    isPublished: {type: Boolean},
    totalGrounds: {type: Number}
  },
  { timestamps: true }
);

appVenueSchema.index({ "location": "2dsphere" });
module.exports = mongoose.model("venue", appVenueSchema, "app.venue");
