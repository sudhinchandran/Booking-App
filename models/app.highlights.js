const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");


const Schema = mongoose.Schema;

const highlightsSchema = new Schema(
    {
      images: {
        uri:{type: String}
      },
      description: {type: String},
      title: {type:String}
    }
    
  )

module.exports = mongoose.model("highlights", highlightsSchema, "app.highlights");