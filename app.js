const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const app = express();
var bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
var cron = require('node-cron');

dotenv.config();
const port = process.env.PORT || 3008;
const db = require("./modules/db.js");
const apiRoutes = require("./routes/all.js");
const logger = require("./modules/logger.js");
const errorHandler = require("./middleware/error.handler");
const sheduler = require("./services/sheduler");

app.use(helmet());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan("dev"));

app.get("/ping", (req, res) => {
  res.send("pong");
});

apiRoutes(app);
app.use(errorHandler);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/logs", express.static(path.join("logs"))); //For Log View Testing

logger.info("APP starting... Version " + require("./package.json").version);
app.listen(port, () => {
  logger.info(`API Backend app started on ${port}`);
});

cron.schedule('*/10 * * * *', () => {
  console.log('sheduler 1')
  sheduler.updateAvailability()
});

cron.schedule('*/5 * * * *', () => {
  sheduler.verifyStripeTransaction()
});

cron.schedule('*/10 * * * *', () => {
  console.log('sheduler 3')
  sheduler.bookingNotification()
});

cron.schedule('59 23 * * *', () => {
  console.log('sheduler 4')
  sheduler.clearVenueAvailability()
});

cron.schedule('*/10 * * * *', () => {
  console.log('sheduler 5')
  sheduler.verifyBookingStatus()
});


cron.schedule('*/3 * * * *', () => {
  console.log('sheduler 6')
  sheduler.bookingWithGameNotification()
});

