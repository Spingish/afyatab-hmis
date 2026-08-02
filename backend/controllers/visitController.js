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
        patient_id, patient_type, visit_date,
        attending_doctor_id, referred_from,
        received_by, directed_to, idempotency_key
      } = req.body;
      if (!patient_id) {
        return res.status(400).json({ success: false, error: 'patient_id is required' });
      }
      const patient = await PatientModel.findById(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }

      // A double-click or a browser network retry must not create two
      // encounters for the same submitted action.
      if (idempotency_key) {
        const dupe = await VisitModel.findByIdempotencyKey(idempotency_key);
        if (dupe) {
          return res.status(200).json({
            success: true, message: 'Visit already created (duplicate request ignored)',
            visit_no: dupe.visit_no, visit: dupe
          });
        }
      }

      const d = visit_date || new Date().toISOString().slice(0, 10);
      const seq = await VisitModel.getNextVisitSequence(patient_id);
      const visit = await VisitModel.createWithRetry({
        patient_id, visit_date: d,
        visit_type:    'New',
        patient_type:  patient_type || 'Outpatient',
        current_stage: 'Reception',
        attending_doctor_id, referred_from,
        received_by,
        directed_to:   directed_to || 'Reception',
        visit_sequence:        seq,
        visit_classification:  seq === 1 ? 'FIRST_VISIT' : 'REVISIT',
        idempotency_key:       idempotency_key || null
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
        patient_id, patient_type, visit_date,
        attending_doctor_id, received_by, directed_to, idempotency_key
      } = req.body;
      if (!patient_id) {
        return res.status(400).json({ success: false, error: 'patient_id is required' });
      }
      const patient = await PatientModel.findById(patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }

      const lastVisitRow = await VisitModel.getMostRecentVisit(patient_id);
      if (!lastVisitRow) {
        return res.status(400).json({ success: false, error: 'Continue Visit requires an existing previous visit. Use Initiate New Visit instead.' });
      }

      const windowHours = await VisitModel.getContinuationWindowHours();
      const hoursSinceLast = (Date.now() - new Date(lastVisitRow.ts).getTime()) / (1000 * 60 * 60);
      const d = visit_date || new Date().toISOString().slice(0, 10);

      let visit, isNewEncounter;

      if (hoursSinceLast < windowHours) {
        // Still inside the continuation window — this is the SAME
        // encounter/episode continuing, not a new one. No new row,
        // no new visit_no; just reopen it and clear the location lock
        // so staff can direct the patient to the next service.
        visit = await VisitModel.reactivateForContinuation(lastVisitRow.id);
        isNewEncounter = false;
      } else {
        // Outside the window — a legitimate new encounter (Revisit),
        // linked back to the prior one for longitudinal history.
        if (idempotency_key) {
          const dupe = await VisitModel.findByIdempotencyKey(idempotency_key);
          if (dupe) {
            return res.status(200).json({
              success: true, message: 'Visit already created (duplicate request ignored)',
              visit_no: dupe.visit_no, visit: dupe
            });
          }
        }
        const seq = await VisitModel.getNextVisitSequence(patient_id);
        visit = await VisitModel.createWithRetry({
          patient_id, visit_date: d,
          visit_type:    'Revisit',
          patient_type:  patient_type || 'Outpatient',
          current_stage: 'Reception',
          attending_doctor_id, received_by,
          directed_to:   directed_to || 'Reception',
          visit_sequence:       seq,
          visit_classification: 'REVISIT',
          related_visit_id:     lastVisitRow.id,
          idempotency_key:      idempotency_key || null
        });
        isNewEncounter = true;
      }

      const lastVisit = await VisitModel.getLastVisitSummary(patient_id);
      const history   = await VisitModel.getPatientHistory(patient_id);

      res.status(isNewEncounter ? 201 : 200).json({
        success:    true,
        message:    isNewEncounter
          ? `New visit (Revisit) started for ${patient.first_name} ${patient.last_name}`
          : `Continuing existing visit ${visit.visit_no} for ${patient.first_name} ${patient.last_name}`,
        visit_no:   visit.visit_no,
        visit_type: visit.visit_type,
        continued_existing_encounter: !isNewEncounter,
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
  },

  // ── Look-up page (daily front-desk workspace) ─────────────────────────

  async lookup(req, res) {
    try {
      const { date, search, type, gender, visit_status, age_range } = req.query;
      const d = date || new Date().toISOString().slice(0, 10);
      const visited = await VisitModel.getLookup({
        date: d, search, patient_type: type, gender, visit_status, age_range
      });

      // Only look for not-yet-visited matches when the user is actually
      // searching for someone — otherwise "today's list" would balloon to
      // include the entire patient register.
      let notYetVisited = [];
      if (search && (!visit_status || visit_status === 'All')) {
        const found = await VisitModel.searchPatientsWithoutVisit({ date: d, search, gender, age_range });
        notYetVisited = found.map(p => ({
          id: `novisit-${p.patient_id}`,
          visit_no: null,
          visit_type: 'New',
          patient_type: null,
          visit_time: null,
          visit_date: d,
          current_stage: null,
          status: null,
          directed_to: null,
          location_locked: false,
          visits_today: 0,
          has_visit_today: false,
          ...p
        }));
      }

      const patients = [
        ...visited.map(p => ({ ...p, has_visit_today: true })),
        ...notYetVisited
      ];
      res.json({ success: true, date: d, count: patients.length, patients });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async moveLocation(req, res) {
    try {
      const { location } = req.body;
      const validLocations = [
        'Triage', 'OPD Consultation', 'Laboratory', 'Radiology',
        'Antenatal Care (ANC)', 'Postnatal Care & Immunization', 'Family Planning'
      ];
      if (!validLocations.includes(location)) {
        return res.status(400).json({ success: false, error: `Invalid location. Must be one of: ${validLocations.join(', ')}` });
      }
      const existing = await VisitModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      if (existing.location_locked || existing.status !== 'Active') {
        return res.status(400).json({ success: false, error: 'This visit has been discharged/completed and its location can no longer be changed.' });
      }
      const visit = await VisitModel.moveLocation(req.params.id, location, req.user?.id);
      res.json({ success: true, message: `Patient moved to ${location}`, visit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const existing = await VisitModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      const hasClinical = await VisitModel.hasClinicalRecords(req.params.id);
      if (hasClinical) {
        return res.status(400).json({
          success: false,
          error: 'This visit has clinical or billing records attached (triage, consultation, lab, prescription, admission or invoice) and cannot be deleted.'
        });
      }
      await VisitModel.remove(req.params.id);
      res.json({ success: true, message: 'Visit record deleted. Patient registration remains intact.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

};

module.exports = visitController;