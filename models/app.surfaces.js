const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const surfacesSchema = new Schema(
    {
        type: {type:Number},
        surfaceName: { type: String },
        surfaceColor: { type: String },
        active:  { type: Boolean },
    },
);

module.exports = mongoose.model("surfaces", surfacesSchema, "app.surfaces")