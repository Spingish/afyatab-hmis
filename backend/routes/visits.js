// AfyaTab HMIS - Visit Routes
const express = require('express');
const router  = express.Router();
const visitController = require('../controllers/visitController');

router.get('/today',               visitController.getToday);
router.get('/dashboard',           visitController.getDashboard);
router.get('/patient/:patient_id', visitController.getPatientHistory);
router.get('/:id',                 visitController.getOne);
router.post('/new',                visitController.startNew);
router.post('/continue',           visitController.continueVisit);
router.put('/:id/stage',           visitController.updateStage);
router.put('/:id/discharge',       visitController.discharge);

module.exports = router;