const venue = require("./venue");

module.exports = function apiRoutes(app) {
  app.use("/api/app/venue", venue);
};
