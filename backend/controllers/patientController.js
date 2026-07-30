// TibaMax HMIS — Patient Controller
const PatientModel = require('../models/patientModel');

const patientController = {

  // GET /api/patients — list all with pagination
  async getAll(req, res) {
    try {
      const { page, limit, status, type } = req.query;
      const data = await PatientModel.getAll({
        page:   parseInt(page)  || 1,
        limit:  parseInt(limit) || 20,
        status, type
      });
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/patients/search?q= — search patients
  async search(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json({ success: true, patients: [] });
      }
      const patients = await PatientModel.search(q);
      res.json({ success: true, count: patients.length, patients });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/patients/:id — get single patient
  async getOne(req, res) {
    try {
      const patient = await PatientModel.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      res.json({ success: true, patient });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/patients/no/:patient_no — get by patient number
  async getByPatientNo(req, res) {
    try {
      const patient = await PatientModel.findByPatientNo(req.params.patient_no);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      res.json({ success: true, patient });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // POST /api/patients — register new patient
  async create(req, res) {
    try {
      const {
        first_name, last_name, other_names, gender,
        date_of_birth, national_id, id_document_type,
        phone, phone_ownership, email,
        county_id, village, blood_group, allergies,
        chronic_conditions, kin_name, kin_phone,
        kin_relationship, relationship, is_family_head
      } = req.body;

      // Required fields
      if (!first_name || !last_name || !gender || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing: first_name, last_name, gender, phone'
        });
      }

      // Duplicate phone check
      const dupPhone = await PatientModel.findByPhone(phone);
      if (dupPhone) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate detected',
          message: `Patient with phone ${phone} already exists`,
          existing: {
            patient_no: dupPhone.patient_no,
            name: `${dupPhone.first_name} ${dupPhone.last_name}`,
            phone: dupPhone.phone
          }
        });
      }

      // Duplicate national ID check
      if (national_id) {
        const dupNid = await PatientModel.findByNationalId(national_id);
        if (dupNid) {
          return res.status(409).json({
            success: false,
            error: 'Duplicate detected',
            message: `Patient with National ID ${national_id} already exists`,
            existing: {
              patient_no: dupNid.patient_no,
              name: `${dupNid.first_name} ${dupNid.last_name}`
            }
          });
        }
      }

      // Handle family account
      let family_account_id = null;
      if (phone) {
        const fullName = `${first_name} ${last_name}`;
        const family = await PatientModel.findOrCreateFamilyAccount(phone, fullName);
        family_account_id = family.id;
      }

      // Generate patient number
      const patient_no = await PatientModel.generatePatientNo();

      // Create patient
      const patient = await PatientModel.create({
        patient_no, first_name, last_name, other_names,
        gender, date_of_birth, national_id, id_document_type,
        phone, phone_ownership, email,
        county_id, village, family_account_id,
        relationship: relationship || 'Self',
        is_family_head: is_family_head !== false,
        blood_group, allergies, chronic_conditions,
        kin_name, kin_phone, kin_relationship,
        registered_by: req.user?.id || null
      });

      res.status(201).json({
        success:  true,
        message:  `Patient registered successfully`,
        patient_no: patient.patient_no,
        patient
      });

    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // PUT /api/patients/:id — update patient
  async update(req, res) {
    try {
      const patient = await PatientModel.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      const updated = await PatientModel.update(req.params.id, req.body);
      res.json({ success: true, message: 'Patient updated', patient: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // DELETE /api/patients/:id — soft delete
  async remove(req, res) {
    try {
      const deleted = await PatientModel.softDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      res.json({ success: true, message: 'Patient record deleted', patient: deleted });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // PUT /api/patients/:id/restore — restore deleted patient
  async restore(req, res) {
    try {
      const restored = await PatientModel.restore(req.params.id);
      if (!restored) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      res.json({ success: true, message: 'Patient record restored', patient: restored });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // GET /api/patients/family/:phone — family lookup
  async getFamilyByPhone(req, res) {
    try {
      const members = await PatientModel.getFamilyByPhone(req.params.phone);
      if (!members.length) {
        return res.status(404).json({
          success: false,
          error: 'No family account found for this phone number'
        });
      }
      res.json({
        success: true,
        phone:   req.params.phone,
        count:   members.length,
        family:  members
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

};

module.exports = patientController;