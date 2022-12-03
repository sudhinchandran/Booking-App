var express = require("express");
var router = express.Router();

const venueController = require("../controllers/venue");

router.post("/refundPolicyList", venueController.refundPolicyList);
router.post("/transactionList", venueController.transactionList);
router.post("/offerList", venueController.offerList);
router.post("/updateBookingStatus", venueController.updateStatus);
router.post("/createOrder", venueController.createOrder);
router.post("/discountMatrix", venueController.discountMatrix);
router.post("/getPolicy", venueController.getPolicy);
router.post("/unlinkGame", venueController.unlinkGame);
router.post("/getVenueAvailability", venueController.availability);
router.post("/linkGame", venueController.linkGame);
router.post("/estimateBooking", venueController.estimateBooking);
router.post("/recentBooking", venueController.recentBooking);
router.post("/cancelBooking", venueController.cancelBooking);
router.post("/myBookingDetails", venueController.myBookingDetails);
router.post("/upcomingBookingList", venueController.upcomingBookingList);
router.post("/completedBookingList", venueController.completedBookingList);
router.post("/cancelledBookingList", venueController.cancelledBookingList);
router.post("/getAvailability", venueController.getAvailability);
router.post("/getPriceChart", venueController.getPriceChart);
router.post("/referGround", venueController.referrGround);
router.post("/bookPitch", venueController.bookPitch);
router.post("/postReviews", venueController.postReview);
router.post("/getReviews", venueController.getReviews);
router.post("/getMapView", venueController.getMapView);
router.post("/list", venueController.getVenueList);
router.post("/get", venueController.getVenueDetails);
router.post("/quickLinks", venueController.getQuickLinks);


module.exports = router;
