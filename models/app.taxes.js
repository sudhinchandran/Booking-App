const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const taxesSchema = new Schema(
    {
        taxValue: {type:Number},
        taxName: { type: String },
        country: {type: mongoose.Types.ObjectId ,ref: "country"},
        type: {type: Number}
    },
);

module.exports = mongoose.model("taxes", taxesSchema, "app.taxes")