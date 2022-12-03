const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const policySchema = new Schema({
    hours: {type: Number},
    refundPersentage: {type: Number}
},{ _id: false })

const refundPolicySchema = new Schema(
    {
        policyName: { type: String },
        policies:  {
            type: [policySchema]
        }
    },
);

module.exports = mongoose.model("refundPolicy", refundPolicySchema, "app.refundPolicy")