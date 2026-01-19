const express = require('express');
const router = express.Router();
const controller = require('../controllers/insuranceClaimController');

router.post('/', controller.createClaim);
router.get('/', controller.getClaims);
router.get('/report', require('../controllers/advancedReportController').generateClaimsReport);
router.post('/:id/submit', controller.submitToSAP);

module.exports = router;
