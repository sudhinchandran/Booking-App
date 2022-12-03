const SEND_SMS = `${process.env.NOTIFICATION_SERVICE}/sendSMS`; //http://localhost:3001/api/sendSMS
const SEND_MOBILE_PUSH = `${process.env.NOTIFICATION_SERVICE}/sendMobilePush`; //http://localhost:3001/api/sendMobilePush
const SEND_EMAIL = `${process.env.NOTIFICATION_SERVICE}/sendEMail`; //http://localhost:3001/api/sendEMail
module.exports = { SEND_SMS, SEND_MOBILE_PUSH, SEND_EMAIL };
