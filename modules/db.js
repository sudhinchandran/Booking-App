const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const logger = require("./logger.js");

// const MONGODB_URL = "mongodb://localhost:27017/11now";
// const MONGODB_URL = "mongodb://kodesmithDBAdmin:"+encodeURIComponent("Kod@Sm1th#2o!9")+"@52.23.164.225/11now";
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info("Connected successfully to  DB server");
  })
  .catch((err) => {
    console.log(err);
    logger.info("Connection failed to  DB server");
  });
