// AfyaTab HMIS — Patient Model
const pool = require('../config/db');

const PatientModel = {

  // Generate next patient number
  async generatePatientNo() {
    const result = await pool.query('SELECT generate_patient_no() AS patient_no');
    return result.rows[0].patient_no;
  },

  // Check duplicate by phone
  async findByPhone(phone) {
    const result = await pool.query(
      'SELECT id, patient_no, first_name, last_name, phone FROM patients WHERE phone = $1 AND is_deleted = FALSE',
      [phone]
    );
    return result.rows[0] || null;
  },

  // Check duplicate by national ID
  async findByNationalId(national_id) {
    const result = await pool.query(
      'SELECT id, patient_no, first_name, last_name, national_id FROM patients WHERE national_id = $1 AND is_deleted = FALSE',
      [national_id]
    );
    return result.rows[0] || null;
  },

  // Find by patient number
  async findByPatientNo(patient_no) {
    const result = await pool.query(
      `SELECT p.*, 
              c.name AS county_name,
              fa.main_phone AS family_phone,
              fa.account_name AS family_name
       FROM patients p
       LEFT JOIN counties c ON c.id = p.county_id
       LEFT JOIN family_accounts fa ON fa.id = p.family_account_id
       WHERE p.patient_no = $1 AND p.is_deleted = FALSE`,
      [patient_no]
    );
    return result.rows[0] || null;
  },

  // Find by ID
  async findById(id) {
    const result = await pool.query(
      `SELECT p.*,
              c.name AS county_name,
              fa.main_phone AS family_phone,
              fa.account_name AS family_name
       FROM patients p
       LEFT JOIN counties c ON c.id = p.county_id
       LEFT JOIN family_accounts fa ON fa.id = p.family_account_id
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [id]
    );
    return result.rows[0] || null;
  },

  // Search patients
  async search(query) {
    const q = `%${query}%`;
    const result = await pool.query(
      `SELECT p.id, p.patient_no, p.first_name, p.last_name,
              p.gender, p.phone, p.national_id, p.date_of_birth,
              p.allergies, p.is_deleted,
              c.name AS county_name
       FROM patients p
       LEFT JOIN counties c ON c.id = p.county_id
       WHERE p.is_deleted = FALSE
         AND (
           p.first_name  ILIKE $1 OR
           p.last_name   ILIKE $1 OR
           p.phone       ILIKE $1 OR
           p.patient_no  ILIKE $1 OR
           p.national_id ILIKE $1
         )
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [q]
    );
    return result.rows;
  },

  // Get all patients with pagination
  async getAll({ page = 1, limit = 20, status, type }) {
    const offset = (page - 1) * limit;
    let where = 'WHERE p.is_deleted = FALSE';
    const params = [];
    let i = 1;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM patients p ${where}`,
      params
    );

    const result = await pool.query(
      `SELECT p.id, p.patient_no, p.first_name, p.last_name,
              p.gender, p.phone, p.national_id, p.date_of_birth,
              p.allergies, p.created_at,
              c.name AS county_name
       FROM patients p
       LEFT JOIN counties c ON c.id = p.county_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]
    );

    return {
      patients: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit)
    };
  },

  // Create new patient
  async create(data) {
    const {
      patient_no, first_name, last_name, other_names,
      gender, date_of_birth, national_id, phone, email,
      county_id, village, family_account_id, relationship,
      is_family_head, blood_group, allergies, chronic_conditions,
      kin_name, kin_phone, kin_relationship, registered_by
    } = data;

    const result = await pool.query(
      `INSERT INTO patients (
        patient_no, first_name, last_name, other_names,
        gender, date_of_birth, national_id, phone, email,
        county_id, village, family_account_id, relationship,
        is_family_head, blood_group, allergies, chronic_conditions,
        kin_name, kin_phone, kin_relationship, registered_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      ) RETURNING *`,
      [
        patient_no, first_name, last_name, other_names || null,
        gender, date_of_birth || null, national_id || null,
        phone, email || null, county_id || null, village || null,
        family_account_id || null, relationship || 'Self',
        is_family_head || false, blood_group || null,
        allergies || 'None', chronic_conditions || null,
        kin_name || null, kin_phone || null,
        kin_relationship || null, registered_by || null
      ]
    );
    return result.rows[0];
  },

  // Update patient
  async update(id, data) {
    const {
      first_name, last_name, other_names, gender,
      date_of_birth, phone, email, county_id, village,
      blood_group, allergies, chronic_conditions,
      kin_name, kin_phone, kin_relationship
    } = data;

    const result = await pool.query(
      `UPDATE patients SET
        first_name=$1, last_name=$2, other_names=$3,
        gender=$4, date_of_birth=$5, phone=$6, email=$7,
        county_id=$8, village=$9, blood_group=$10,
        allergies=$11, chronic_conditions=$12,
        kin_name=$13, kin_phone=$14, kin_relationship=$15,
        updated_at=NOW()
       WHERE id=$16 AND is_deleted=FALSE
       RETURNING *`,
      [
        first_name, last_name, other_names || null,
        gender, date_of_birth || null, phone, email || null,
        county_id || null, village || null, blood_group || null,
        allergies || 'None', chronic_conditions || null,
        kin_name || null, kin_phone || null,
        kin_relationship || null, id
      ]
    );
    return result.rows[0];
  },

  // Soft delete patient
  async softDelete(id) {
    const result = await pool.query(
      `UPDATE patients SET
        is_deleted=TRUE, deleted_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING id, patient_no, first_name, last_name`,
      [id]
    );
    return result.rows[0];
  },

  // Restore deleted patient
  async restore(id) {
    const result = await pool.query(
      `UPDATE patients SET
        is_deleted=FALSE, deleted_at=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING id, patient_no, first_name, last_name`,
      [id]
    );
    return result.rows[0];
  },

  // Family account — find or create
  async findOrCreateFamilyAccount(phone, name) {
    let result = await pool.query(
      'SELECT * FROM family_accounts WHERE main_phone = $1',
      [phone]
    );
    if (result.rows[0]) return result.rows[0];

    result = await pool.query(
      'INSERT INTO family_accounts (main_phone, account_name) VALUES ($1, $2) RETURNING *',
      [phone, name]
    );
    return result.rows[0];
  },

  // Get family members by phone
  async getFamilyByPhone(phone) {
    const result = await pool.query(
      `SELECT p.id, p.patient_no, p.first_name, p.last_name,
              p.gender, p.date_of_birth, p.relationship,
              p.is_family_head, p.allergies,
              fa.main_phone, fa.account_name
       FROM patients p
       JOIN family_accounts fa ON fa.id = p.family_account_id
       WHERE fa.main_phone = $1 AND p.is_deleted = FALSE
       ORDER BY p.is_family_head DESC, p.first_name`,
      [phone]
    );
    return result.rows;
  }

};

module.exports = PatientModel;