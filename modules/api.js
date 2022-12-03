const axios = require("axios");

const logger = require("./logger.js");
const status = require("../utils/status");

async function getApi(url, method, data) {
  logger.info("Call External Api");
  const config = {
    url: url,
    method: method,
    data: data,
  };
  //For local testing
  /*
  if (
    url == `${process.env.NOTIFICATION_SERVICE}/sendSMS` ||
    url == `${process.env.NOTIFICATION_SERVICE}/sendMobilePush`
  ) {
    return true;
  }
*/
  const response = await axios(config);

  if (!response) {
    logger.error("External Api Error " + url + data);
    throw new Error("Invalid Request");
  }

  return response;
}

module.exports = getApi;
