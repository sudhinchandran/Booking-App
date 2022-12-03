const logger = require("../modules/logger.js");
module.exports = (err, req, res, next) => {
  let errors = err.errors || [{ message: err.message }];
  logger.error(`Unhandled Error` + JSON.stringify(errors));
  if (err.status == 413) {
    res.status(413).json({ status: "EN_1038" });
  } else {
    res.status(err.status || 500).json({ errors });
  }
};
