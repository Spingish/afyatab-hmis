// TibaMax HMIS - Visit Controller
const VisitModel   = require('../models/visitModel');
const PatientModel = require('../models/patientModel');

const visitController = {

  async getToday(req, res) {
    try {
      const { stage, status, patient_type } = req.query;
      const visits = await VisitModel.getTodayVisits({ stage, status, patient_type });
      res.json({ success: true, count: visits.length, visits });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getDashboard(req, res) {
    try {
      const summary = await VisitModel.getDashboardSummary();
      res.json({ success: true, summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getPatientHistory(req, res) {
    try {
      const { patient_id } = req.params;
      const patient = await PatientModel.findById(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      const history = await VisitModel.getPatientHistory(patient_id);
      res.json({
        success: true,
        patient: {
          id:                 patient.id,
          patient_no:         patient.patient_no,
          name:               `${patient.first_name} ${patient.last_name}`,
          phone:              patient.phone,
          allergies:          patient.allergies,
          blood_group:        patient.blood_group,
          chronic_conditions: patient.chronic_conditions
        },
        total_visits: history.length,
        history
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getOne(req, res) {
    try {
      const visit = await VisitModel.findById(req.params.id);
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      res.json({ success: true, visit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async startNew(req, res) {
    try {
      const {
        patient_id, patient_type,
        attending_doctor_id, referred_from,
        received_by, directed_to
      } = req.body;
      if (!patient_id) {
        return res.status(400).json({ success: false, error: 'patient_id is required' });
      }
      const patient = await PatientModel.findById(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      const visit_no = await VisitModel.generateVisitNo();
      const visit = await VisitModel.create({
        visit_no, patient_id,
        visit_type:    'New',
        patient_type:  patient_type || 'Outpatient',
        current_stage: 'Reception',
        attending_doctor_id, referred_from,
        received_by,
        directed_to:   directed_to || 'Triage'
      });
      res.status(201).json({
        success:  true,
        message:  `New visit started for ${patient.first_name} ${patient.last_name}`,
        visit_no: visit.visit_no,
        visit
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async continueVisit(req, res) {
    try {
      const {
        patient_id, patient_type,
        attending_doctor_id, received_by, directed_to
      } = req.body;
      if (!patient_id) {
        return res.status(400).json({ success: false, error: 'patient_id is required' });
      }
      const patient = await PatientModel.findById(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      const lastVisit = await VisitModel.getLastVisitSummary(patient_id);
      const history   = await VisitModel.getPatientHistory(patient_id);
      const visit_no  = await VisitModel.generateVisitNo();
      const visit     = await VisitModel.create({
        visit_no, patient_id,
        visit_type:    'Revisit',
        patient_type:  patient_type || 'Outpatient',
        current_stage: 'Reception',
        attending_doctor_id, received_by,
        directed_to:   directed_to || 'Triage'
      });
      res.status(201).json({
        success:    true,
        message:    `Continuation visit started for ${patient.first_name} ${patient.last_name}`,
        visit_no:   visit.visit_no,
        visit_type: 'Revisit',
        visit,
        patient_summary: {
          patient_no:         patient.patient_no,
          name:               `${patient.first_name} ${patient.last_name}`,
          gender:             patient.gender,
          phone:              patient.phone,
          allergies:          patient.allergies,
          blood_group:        patient.blood_group,
          chronic_conditions: patient.chronic_conditions,
          kin_name:           patient.kin_name,
          kin_phone:          patient.kin_phone
        },
        previous_clinical_summary: lastVisit ? {
          last_visit_date:   lastVisit.visit_date,
          last_visit_no:     lastVisit.visit_no,
          chief_complaint:   lastVisit.chief_complaint,
          working_diagnosis: lastVisit.working_diagnosis,
          all_diagnoses:     lastVisit.all_diagnoses,
          management_plan:   lastVisit.management_plan,
          follow_up_date:    lastVisit.follow_up_date,
          doctor:            lastVisit.doctor_name,
          vitals: {
            temperature: lastVisit.temperature,
            bp: lastVisit.blood_pressure_systolic
              ? `${lastVisit.blood_pressure_systolic}/${lastVisit.blood_pressure_diastolic}`
              : null,
            pulse:  lastVisit.pulse_rate,
            spo2:   lastVisit.oxygen_saturation,
            weight: lastVisit.weight_kg
          }
        } : null,
        visit_history: {
          total_visits: history.length,
          visits:       history
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async updateStage(req, res) {
    try {
      const { stage } = req.body;
      const validStages = [
        'Reception','Triage','Consultation',
        'Investigation','Procedure','Pharmacy','Discharged'
      ];
      if (!validStages.includes(stage)) {
        return res.status(400).json({
          success: false,
          error: `Invalid stage. Must be one of: ${validStages.join(', ')}`
        });
      }
      const visit = await VisitModel.updateStage(
        req.params.id, stage, req.body.staff_id
      );
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      res.json({ success: true, message: `Patient moved to ${stage}`, visit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async discharge(req, res) {
    try {
      const visit = await VisitModel.discharge(req.params.id, req.body);
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      res.json({ success: true, message: 'Patient discharged successfully', visit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

};

module.exports = visitController;