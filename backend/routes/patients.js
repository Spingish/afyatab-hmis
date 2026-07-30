// TibaMax HMIS — Patient Routes
const express = require('express');
const router  = express.Router();
const { requirePermission } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

// Search must come before /:id to avoid conflict
router.get('/search',           patientController.search);
router.get('/family/:phone',    patientController.getFamilyByPhone);
router.get('/no/:patient_no',   patientController.getByPatientNo);
router.get('/',                 patientController.getAll);
router.get('/:id',              patientController.getOne);
router.post('/',                requirePermission('patient.register'),          patientController.create);
router.put('/:id',              requirePermission('patient.edit_demographics'), patientController.update);
router.put('/:id/restore',      requirePermission('patient.edit_demographics'), patientController.restore);
router.delete('/:id',           requirePermission('patient.delete'),            patientController.remove);

module.exports = router;