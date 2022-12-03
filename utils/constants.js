const JWT_SECRET = process.env.JWT_SECRET
  ? process.env.JWT_SECRET
  : "JWTTOKENKod@Sm1th#2o!9JWTTOKEN";
const SALT_ROUNDS = process.env.SALT_ROUNDS ? process.env.SALT_ROUNDS : 10;
const MAXIMUM_OTP_LIMIT = process.env.MAXIMUM_OTP_LIMIT
  ? process.env.MAXIMUM_OTP_LIMIT
  : 10;
const OTP_RESEND_INTERVAL = process.env.OTP_RESEND_INTERVAL
  ? process.env.OTP_RESEND_INTERVAL
  : 120;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  ? process.env.GOOGLE_API_KEY
  : "AIzaSyBts7s-Pc6sNa6XeF8i9cg1-_3hlLbTZLs";
const SMS_RETRIEVER_KEY = process.env.SMS_RETRIEVER_KEY
  ? process.env.SMS_RETRIEVER_KEY
  : "FZSN5nAvxxB";
const STREAM_API_KEY = process.env.STREAM_API_KEY
  ? process.env.STREAM_API_KEY
  : "f5tf7s9x3u4c";
const STREAM_APP_SECRET = process.env.STREAM_APP_SECRET
  ? process.env.STREAM_APP_SECRET
  : "hdegqn832wabsgjkx3r7wuhfphbed38hv7u648kpv8ef7h6wnfrhz8mpcxgpb34n";
const STREAM_APP_ID = process.env.STREAM_APP_ID
  ? process.env.STREAM_APP_ID
  : "1120437";
const CRYPTO_KEY = process.env.CRYPTO_KEY ? process.env.CRYPTO_KEY : "Key";
const NOTIFICATION_TIME_MIN = 60;

module.exports = {
  JWT_SECRET,
  SALT_ROUNDS,
  MAXIMUM_OTP_LIMIT,
  OTP_RESEND_INTERVAL,
  GOOGLE_API_KEY,
  STREAM_API_KEY,
  STREAM_APP_SECRET,
  STREAM_APP_ID,
  SMS_RETRIEVER_KEY,
  CRYPTO_KEY,
  NOTIFICATION_TIME_MIN
};
