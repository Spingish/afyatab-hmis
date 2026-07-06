// AfyaTab HMIS — Patient Routes
const express = require('express');
const router  = express.Router();
const patientController = require('../controllers/patientController');

// Search must come before /:id to avoid conflict
router.get('/search',           patientController.search);
router.get('/family/:phone',    patientController.getFamilyByPhone);
router.get('/no/:patient_no',   patientController.getByPatientNo);
router.get('/',                 patientController.getAll);
router.get('/:id',              patientController.getOne);
router.post('/',                patientController.create);
router.put('/:id',              patientController.update);
router.put('/:id/restore',      patientController.restore);
router.delete('/:id',           patientController.remove);

module.exports = router;