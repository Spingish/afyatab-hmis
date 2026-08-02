// TibaMax HMIS - Visit Routes
const express = require('express');
const router  = express.Router();
const { requirePermission } = require('../middleware/auth');
const visitController = require('../controllers/visitController');

// NOTE: '/lookup' must be declared before '/:id' or Express will treat
// "lookup" as an :id value.
router.get('/today',               visitController.getToday);
router.get('/lookup',              visitController.lookup);
router.get('/dashboard',           visitController.getDashboard);
router.get('/patient/:patient_id', visitController.getPatientHistory);
router.get('/:id',                 visitController.getOne);
router.post('/new',                visitController.startNew);
router.post('/continue',           visitController.continueVisit);
router.put('/:id/stage',           visitController.updateStage);
router.put('/:id/move',            requirePermission('visit.move'),   visitController.moveLocation);
router.put('/:id/discharge',       visitController.discharge);
router.delete('/:id',              requirePermission('visit.delete'), visitController.remove);

module.exports = router;
