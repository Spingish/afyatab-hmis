// TibaMax HMIS - Visit Model
const pool = require('../config/db');

const VisitModel = {

  async generateVisitNo() {
    const result = await pool.query('SELECT generate_visit_no() AS visit_no');
    return result.rows[0].visit_no;
  },

  async create(data) {
    const {
      visit_no, patient_id, visit_type, patient_type,
      current_stage, attending_doctor_id, referred_from,
      received_by, directed_to
    } = data;
    const result = await pool.query(
      `INSERT INTO visits (
        visit_no, patient_id, visit_type, patient_type,
        current_stage, attending_doctor_id, referred_from,
        received_by, directed_to, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')
      RETURNING *`,
      [
        visit_no, patient_id,
        visit_type || 'New',
        patient_type || 'Outpatient',
        current_stage || 'Reception',
        attending_doctor_id || null,
        referred_from || null,
        received_by || null,
        directed_to || 'Triage'
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT v.*,
              p.patient_no, p.first_name, p.last_name,
              p.gender, p.date_of_birth, p.phone,
              p.allergies, p.blood_group, p.chronic_conditions,
              p.kin_name, p.kin_phone,
              s.first_name || ' ' || s.last_name AS doctor_name,
              r.first_name || ' ' || r.last_name AS received_by_name
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN staff s ON s.id = v.attending_doctor_id
       LEFT JOIN staff r ON r.id = v.received_by
       WHERE v.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getPatientHistory(patient_id) {
    const result = await pool.query(
      `SELECT v.id, v.visit_no, v.visit_type, v.patient_type,
              v.visit_date, v.current_stage, v.status,
              v.directed_to, v.discharge_date,
              s.first_name || ' ' || s.last_name AS doctor_name,
              (SELECT STRING_AGG(cd.diagnosis_text, ', ')
               FROM consultations c
               JOIN consultation_diagnoses cd ON cd.consultation_id = c.id
               WHERE c.visit_id = v.id) AS diagnoses
       FROM visits v
       LEFT JOIN staff s ON s.id = v.attending_doctor_id
       WHERE v.patient_id = $1
       ORDER BY v.visit_date DESC, v.visit_time DESC`,
      [patient_id]
    );
    return result.rows;
  },

  async getLastVisitSummary(patient_id) {
    const result = await pool.query(
      `SELECT
        v.id AS visit_id, v.visit_no, v.visit_date,
        v.visit_type, v.status,
        t.temperature, t.blood_pressure_systolic,
        t.blood_pressure_diastolic, t.pulse_rate,
        t.weight_kg, t.oxygen_saturation,
        t.chief_complaint AS triage_complaint,
        c.chief_complaint, c.working_diagnosis,
        c.management_plan, c.follow_up_date,
        s.first_name || ' ' || s.last_name AS doctor_name,
        (SELECT STRING_AGG(cd.diagnosis_text, ' | ')
         FROM consultation_diagnoses cd
         WHERE cd.consultation_id = c.id) AS all_diagnoses
       FROM visits v
       LEFT JOIN triage t ON t.visit_id = v.id
       LEFT JOIN consultations c ON c.visit_id = v.id
       LEFT JOIN staff s ON s.id = c.doctor_id
       WHERE v.patient_id = $1
       ORDER BY v.visit_date DESC, v.visit_time DESC
       LIMIT 1`,
      [patient_id]
    );
    return result.rows[0] || null;
  },

  async getTodayVisits({ stage, status, patient_type } = {}) {
    let where = 'WHERE v.visit_date = CURRENT_DATE';
    const params = [];
    let i = 1;
    if (stage) { where += ` AND v.current_stage = $${i++}`; params.push(stage); }
    if (status) { where += ` AND v.status = $${i++}`; params.push(status); }
    if (patient_type) { where += ` AND v.patient_type = $${i++}`; params.push(patient_type); }
    const result = await pool.query(
      `SELECT v.id, v.visit_no, v.visit_type, v.patient_type,
              v.visit_time, v.current_stage, v.status,
              v.directed_to,
              p.patient_no, p.first_name, p.last_name,
              p.phone, p.gender, p.allergies,
              s.first_name || ' ' || s.last_name AS doctor_name,
              (SELECT COUNT(*) FROM visits pv
               WHERE pv.patient_id = v.patient_id
               AND pv.id != v.id) AS previous_visits_count
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       LEFT JOIN staff s ON s.id = v.attending_doctor_id
       ${where}
       ORDER BY v.visit_time ASC`,
      params
    );
    return result.rows;
  },

  async updateStage(id, stage, staff_id) {
    const result = await pool.query(
      `UPDATE visits SET current_stage=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [stage, id]
    );
    if (result.rows[0]) {
      await pool.query(
        `INSERT INTO visit_stage_log (visit_id, to_stage, moved_by)
         VALUES ($1,$2,$3)`,
        [id, stage, staff_id || null]
      );
    }
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE visits SET status=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  async discharge(id, data) {
    const { discharge_notes, discharged_by } = data;
    const result = await pool.query(
      `UPDATE visits SET
        status='Discharged', discharge_date=CURRENT_DATE,
        discharge_notes=$1, discharged_by=$2,
        current_stage='Discharged', updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [discharge_notes || null, discharged_by || null, id]
    );
    return result.rows[0];
  },

  async getDashboardSummary() {
    const result = await pool.query('SELECT * FROM v_today_summary');
    return result.rows[0];
  }

};

module.exports = VisitModel;