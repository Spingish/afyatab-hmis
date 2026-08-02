// TibaMax HMIS - Visit Model
const pool = require('../config/db');

const VisitModel = {

  async generateVisitNo() {
    const result = await pool.query('SELECT generate_visit_no() AS visit_no');
    return result.rows[0].visit_no;
  },

  async create(data) {
    const {
      visit_no, patient_id, visit_type, patient_type, visit_date,
      current_stage, attending_doctor_id, referred_from,
      received_by, directed_to,
      visit_sequence, visit_classification, related_visit_id, idempotency_key
    } = data;
    const result = await pool.query(
      `INSERT INTO visits (
        visit_no, patient_id, visit_type, patient_type, visit_date,
        current_stage, attending_doctor_id, referred_from,
        received_by, directed_to, status,
        visit_sequence, visit_classification, related_visit_id, idempotency_key
      ) VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7,$8,$9,$10,'Active',$11,$12,$13,$14)
      RETURNING *`,
      [
        visit_no, patient_id,
        visit_type || 'New',
        patient_type || 'Outpatient',
        visit_date || null,
        current_stage || 'Reception',
        attending_doctor_id || null,
        referred_from || null,
        received_by || null,
        directed_to || 'Reception',
        visit_sequence || null,
        visit_classification || null,
        related_visit_id || null,
        idempotency_key || null
      ]
    );
    return result.rows[0];
  },

  async findByIdempotencyKey(key) {
    if (!key) return null;
    const result = await pool.query('SELECT * FROM visits WHERE idempotency_key = $1', [key]);
    return result.rows[0] || null;
  },

  // The real chronological sequence number for this patient's next
  // encounter — derived, never typed by staff. 1 = FIRST_VISIT,
  // anything after = REVISIT.
  async getNextVisitSequence(patient_id) {
    const result = await pool.query(
      `SELECT COALESCE(MAX(visit_sequence), COUNT(*)::int, 0) AS max_seq
       FROM visits WHERE patient_id = $1`,
      [patient_id]
    );
    return (result.rows[0].max_seq || 0) + 1;
  },

  // Most recent visit for a patient, any date — used to decide
  // continuation-of-same-encounter vs. a genuinely new encounter.
  async getMostRecentVisit(patient_id) {
    const result = await pool.query(
      `SELECT *, (visit_date + visit_time) AS ts FROM visits
       WHERE patient_id = $1
       ORDER BY visit_date DESC, visit_time DESC LIMIT 1`,
      [patient_id]
    );
    return result.rows[0] || null;
  },

  // Reactivate an existing visit for same-encounter continuation
  // (within the continuation window) — no new row, no new visit_no.
  // Also clears the location lock so staff can direct the patient to
  // the next service within the same encounter (e.g. Lab → Pharmacy).
  async reactivateForContinuation(id) {
    const result = await pool.query(
      `UPDATE visits SET status = 'Active', location_locked = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async getContinuationWindowHours() {
    const result = await pool.query(
      'SELECT encounter_continuation_window_hours FROM hospital_settings LIMIT 1'
    );
    return result.rows[0]?.encounter_continuation_window_hours ?? 6;
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
        current_stage='Discharged', location_locked=TRUE, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [discharge_notes || null, discharged_by || null, id]
    );
    return result.rows[0];
  },

  async getDashboardSummary() {
    const result = await pool.query('SELECT * FROM v_today_summary');
    return result.rows[0];
  },

  // ── Look-up page (daily front-desk workspace) ─────────────────────────

  async getLookup({ date, search, patient_type, gender, visit_status, age_range } = {}) {
    const d = date || new Date().toISOString().slice(0, 10);
    let where = 'WHERE v.visit_date = $1';
    const params = [d];
    let i = 2;

    if (search) {
      where += ` AND (
        p.first_name ILIKE $${i} OR p.last_name ILIKE $${i} OR
        p.phone ILIKE $${i} OR p.patient_no ILIKE $${i} OR
        p.national_id ILIKE $${i} OR v.visit_no ILIKE $${i}
      )`;
      params.push(`%${search}%`); i++;
    }
    if (patient_type && patient_type !== 'All') {
      where += ` AND v.visit_type = $${i++}`;
      params.push(patient_type);
    }
    if (gender && gender !== 'All') {
      where += ` AND p.gender = $${i++}`;
      params.push(gender);
    }
    if (visit_status && visit_status !== 'All') {
      where += ` AND v.visit_type = $${i++}`;
      params.push(visit_status);
    }
    if (age_range && age_range !== 'All') {
      const ranges = { '0-5': [0, 5], '6-17': [6, 17], '18-35': [18, 35], '36-59': [36, 59], '60+': [60, 200] };
      const r = ranges[age_range];
      if (r) {
        where += ` AND EXTRACT(YEAR FROM AGE($${i}::date, p.date_of_birth)) BETWEEN $${i + 1} AND $${i + 2}`;
        params.push(d, r[0], r[1]);
        i += 3;
      }
    }

    const result = await pool.query(
      `SELECT v.id, v.visit_no, v.visit_type, v.patient_type,
              v.visit_time, v.visit_date, v.current_stage, v.status,
              v.directed_to, v.location_locked,
              v.visit_sequence, v.visit_classification,
              p.id AS patient_id, p.patient_no, p.first_name, p.last_name,
              p.phone, p.gender, p.date_of_birth,
              EXTRACT(YEAR FROM AGE($1::date, p.date_of_birth))::int AS age,
              (SELECT COUNT(*) FROM visits pv
               WHERE pv.patient_id = v.patient_id AND pv.visit_date = $1) AS visits_today
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       ${where}
       ORDER BY v.visit_time ASC`,
      params
    );
    return result.rows;
  },

  // Patients matching a search term who have NOT yet been visited on the
  // given date — lets front-desk staff find and Initiate a visit for someone
  // who hasn't checked in today, not just re-list today's existing rows.
  async searchPatientsWithoutVisit({ date, search, gender, age_range } = {}) {
    if (!search) return [];
    const d = date || new Date().toISOString().slice(0, 10);
    let where = `WHERE (
      p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR
      p.phone ILIKE $1 OR p.patient_no ILIKE $1 OR p.national_id ILIKE $1
    ) AND NOT EXISTS (
      SELECT 1 FROM visits v WHERE v.patient_id = p.id AND v.visit_date = $2
    )`;
    const params = [`%${search}%`, d];
    let i = 3;

    if (gender && gender !== 'All') {
      where += ` AND p.gender = $${i++}`;
      params.push(gender);
    }
    if (age_range && age_range !== 'All') {
      const ranges = { '0-5': [0, 5], '6-17': [6, 17], '18-35': [18, 35], '36-59': [36, 59], '60+': [60, 200] };
      const r = ranges[age_range];
      if (r) {
        where += ` AND EXTRACT(YEAR FROM AGE($${i}::date, p.date_of_birth)) BETWEEN $${i + 1} AND $${i + 2}`;
        params.push(d, r[0], r[1]);
        i += 3;
      }
    }

    const result = await pool.query(
      `SELECT p.id AS patient_id, p.patient_no, p.first_name, p.last_name,
              p.phone, p.gender, p.date_of_birth,
              EXTRACT(YEAR FROM AGE($2::date, p.date_of_birth))::int AS age
       FROM patients p
       ${where}
       ORDER BY p.first_name ASC
       LIMIT 20`,
      params
    );
    return result.rows;
  },

  async countForPatientOnDate(patient_id, date) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM visits WHERE patient_id = $1 AND visit_date = $2`,
      [patient_id, date]
    );
    return result.rows[0].count;
  },

  async getLastVisitDate(patient_id, beforeDate) {
    const result = await pool.query(
      `SELECT visit_date FROM visits
       WHERE patient_id = $1 AND visit_date < $2
       ORDER BY visit_date DESC LIMIT 1`,
      [patient_id, beforeDate]
    );
    return result.rows[0]?.visit_date || null;
  },

  async getLastVisitTimestamp(patient_id) {
    const result = await pool.query(
      `SELECT (visit_date + visit_time) AS ts FROM visits
       WHERE patient_id = $1
       ORDER BY visit_date DESC, visit_time DESC LIMIT 1`,
      [patient_id]
    );
    return result.rows[0]?.ts || null;
  },

  async moveLocation(id, location, staff_id) {
    const result = await pool.query(
      `UPDATE visits SET directed_to = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [location, id]
    );
    if (result.rows[0]) {
      await pool.query(
        `INSERT INTO visit_stage_log (visit_id, to_stage, moved_by, notes)
         VALUES ($1, $2, $3, 'Moved via Look-up')`,
        [id, location, staff_id || null]
      );
    }
    return result.rows[0];
  },

  // Tables that hold real clinical/financial work tied to a visit. If any of
  // these have rows for this visit, the visit itself must not be deleted —
  // only the harmless stage-log audit trail is safe to clear automatically.
  async hasClinicalRecords(id) {
    const result = await pool.query(
      `SELECT
        EXISTS(SELECT 1 FROM triage             WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM consultations      WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM lab_requests       WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM prescriptions      WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM admissions         WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM anc_register       WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM pnc_register       WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM fp_register        WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM cwc_register       WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM immunization_log   WHERE visit_id = $1) OR
        EXISTS(SELECT 1 FROM invoices           WHERE visit_id = $1)
        AS has_records`,
      [id]
    );
    return result.rows[0].has_records;
  },

  async remove(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM visit_stage_log WHERE visit_id = $1', [id]);
      const result = await client.query('DELETE FROM visits WHERE id = $1 RETURNING id', [id]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

};

module.exports = VisitModel;