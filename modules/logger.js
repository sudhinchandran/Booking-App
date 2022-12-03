const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");
const { combine, timestamp, label, printf } = winston.format;

const logFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    /*
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
    */
  },
  filename: {
    error: path.join(__dirname, `../logs/error/error_%DATE%`),
    warn: path.join(__dirname, `../logs/warn/warn_%DATE%`),
    info: path.join(__dirname, `../logs/info/info_%DATE%`),
    /*
    http: path.join(__dirname, `../logs/http/http_%DATE%`),
    verbose: path.join(__dirname, `../logs/verbose/verbose_%DATE%`),
    debug: path.join(__dirname, `../logs/debug/debug_%DATE%`),
    silly: path.join(__dirname, `../logs/silly/silly_%DATE%`),
    */
  },
};
let transport = [
  new winston.transports.DailyRotateFile({
    filename: customLevels.filename.error,
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "200d",
    extension: ".log",
    level: "error",
  }),

  new winston.transports.DailyRotateFile({
    filename: customLevels.filename.warn,
    extension: ".log",
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "200d",
    level: "warn",
  }),

  new winston.transports.DailyRotateFile({
    filename: customLevels.filename.info,
    handleExceptions: true,
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "200d",
    extension: ".log",
    level: "info",
  }),
  /*
  new DailyRotateFile({
    filename: customLevels.filename.http,
    handleExceptions: true,
    extension: ".log",
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "365d",
    level: "http",
  }),
  new DailyRotateFile({
    filename: customLevels.filename.verbose,
    handleExceptions: true,
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "365d",
    extension: ".log",
    level: "verbose",
  }),
  new DailyRotateFile({
    filename: customLevels.filename.debug,
    handleExceptions: true,
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "365d",
    extension: ".log",
    level: "debug",
  }),
  new DailyRotateFile({
    filename: customLevels.filename.silly,
    handleExceptions: true,
    // zippedArchive: true,
    maxSize: "20m",
    maxFiles: "365d",
    extension: ".log",
    level: "silly",
  }),
  */
];

/*
transport[0].on("rotate", function (oldFilename, newFilename) {
  console.log(oldFilename);
});
*/

let logger = winston.createLogger({
  levels: customLevels.levels,
  format: combine(label({ label: "API BACKEND" }), timestamp(), logFormat),
  transports: transport,
  // exitOnError: false,
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(label({ label: "API BACKEND" }), timestamp(), logFormat),
    })
  );
}

module.exports = logger;
