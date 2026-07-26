// AfyaTab HMIS - Dashboard Routes
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET /api/dashboard — full live dashboard data
router.get('/', async (req, res) => {
  try {
    const [
      todaySummary,
      weeklyOPD,
      revenueToday,
      revenueWeek,
      revenueMonth,
      pendingBills,
      lowStock,
      expiringDrugs,
      labToday,
      pharmacyToday,
      admissions,
      bedOccupancy,
      recentPatients,
      recentActivity,
      appointmentsToday,
      triageToday,
      consultationsToday,
      monthlyTrend
    ] = await Promise.all([

      // Today summary
      pool.query('SELECT * FROM v_today_summary'),

      // Weekly OPD
      pool.query(
        `SELECT visit_date, COUNT(*) AS visits
         FROM visits
         WHERE visit_date >= CURRENT_DATE - INTERVAL '7 days'
           AND patient_type = 'Outpatient'
         GROUP BY visit_date
         ORDER BY visit_date`
      ),

      // Revenue today
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total,
                COUNT(*) AS transactions
         FROM payments
         WHERE payment_date = CURRENT_DATE`
      ),

      // Revenue this week
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM payments
         WHERE payment_date >= DATE_TRUNC('week', CURRENT_DATE)`
      ),

      // Revenue this month
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM payments
         WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)`
      ),

      // Pending bills
      pool.query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(balance),0) AS total_balance
         FROM invoices
         WHERE status IN ('Pending','Partial')`
      ),

      // Low stock count
      pool.query('SELECT COUNT(*) AS count FROM v_low_stock'),

      // Expiring drugs
      pool.query('SELECT COUNT(*) AS count FROM v_expiring_drugs'),

      // Lab requests today
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN status='Pending'    THEN 1 END) AS pending,
                COUNT(CASE WHEN status='Processing' THEN 1 END) AS processing,
                COUNT(CASE WHEN status='Ready'      THEN 1 END) AS ready
         FROM lab_requests
         WHERE requested_at::date = CURRENT_DATE`
      ),

      // Pharmacy today
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN status='Pending'   THEN 1 END) AS pending,
                COUNT(CASE WHEN status='Dispensed' THEN 1 END) AS dispensed
         FROM prescriptions
         WHERE prescribed_at::date = CURRENT_DATE`
      ),

      // Current admissions
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN EXTRACT(DAY FROM NOW()-admission_date) = 0 THEN 1 END) AS admitted_today,
                COUNT(CASE WHEN status='Discharged' AND discharge_date::date=CURRENT_DATE THEN 1 END) AS discharged_today
         FROM admissions
         WHERE status IN ('Admitted','Discharged')`
      ),

      // Bed occupancy
      pool.query('SELECT * FROM v_bed_occupancy'),

      // Recent patients registered (last 8), with latest visit status + triage priority
      pool.query(
        `SELECT p.patient_no, p.first_name, p.last_name,
                p.gender, p.phone, p.created_at,
                lv.status AS visit_status,
                lt.priority AS triage_priority
         FROM patients p
         LEFT JOIN LATERAL (
           SELECT status FROM visits
           WHERE patient_id = p.id
           ORDER BY created_at DESC LIMIT 1
         ) lv ON TRUE
         LEFT JOIN LATERAL (
           SELECT t.priority FROM triage t
           JOIN visits v2 ON v2.id = t.visit_id
           WHERE v2.patient_id = p.id
           ORDER BY t.triaged_at DESC LIMIT 1
         ) lt ON TRUE
         WHERE p.is_deleted = FALSE
         ORDER BY p.created_at DESC
         LIMIT 8`
      ),

      // Recent activity (visits, lab, payments)
      pool.query(
        `SELECT * FROM (
          SELECT 'visit' AS type,
                 'New visit: ' || p.first_name || ' ' || p.last_name AS description,
                 v.created_at AS time
          FROM visits v
          JOIN patients p ON p.id = v.patient_id
          WHERE v.created_at >= NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT 'lab',
                 'Lab result ready: ' || p.first_name || ' ' || p.last_name,
                 lr.completed_at
          FROM lab_requests lr
          JOIN patients p ON p.id = lr.patient_id
          WHERE lr.status = 'Ready'
            AND lr.completed_at >= NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT 'payment',
                 'Payment received: KES ' || py.amount::TEXT,
                 py.created_at
          FROM payments py
          WHERE py.created_at >= NOW() - INTERVAL '24 hours'
          UNION ALL
          SELECT 'patient',
                 'Patient registered: ' || p.first_name || ' ' || p.last_name,
                 p.created_at
          FROM patients p
          WHERE p.created_at >= NOW() - INTERVAL '24 hours'
            AND p.is_deleted = FALSE
        ) activity
        ORDER BY time DESC
        LIMIT 10`
      ),

      // Appointments today
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN status='Scheduled' THEN 1 END) AS scheduled,
                COUNT(CASE WHEN status='Visited'   THEN 1 END) AS visited,
                COUNT(CASE WHEN status='Missed'    THEN 1 END) AS missed
         FROM appointments
         WHERE appointment_date = CURRENT_DATE`
      ),

      // Triage today
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(CASE WHEN priority='Emergency' THEN 1 END) AS emergency,
                COUNT(CASE WHEN priority='Urgent'    THEN 1 END) AS urgent,
                COUNT(CASE WHEN priority='Normal'    THEN 1 END) AS normal
         FROM triage
         WHERE triaged_at::date = CURRENT_DATE`
      ),

      // Consultations today
      pool.query(
        `SELECT COUNT(*) AS total
         FROM consultations
         WHERE consultation_date = CURRENT_DATE`
      ),

      // Monthly trend (last 6 months)
      pool.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', visit_date), 'Mon') AS month,
           COUNT(CASE WHEN patient_type='Outpatient' THEN 1 END) AS opd,
           COUNT(CASE WHEN patient_type='Inpatient'  THEN 1 END) AS ipd,
           COUNT(*) AS total
         FROM visits
         WHERE visit_date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         GROUP BY DATE_TRUNC('month', visit_date)
         ORDER BY DATE_TRUNC('month', visit_date)`
      ),
    ]);

    res.json({
      success: true,
      data: {
        // Today counts
        today: {
          ...todaySummary.rows[0],
          lab_requests:      labToday.rows[0],
          pharmacy:          pharmacyToday.rows[0],
          appointments:      appointmentsToday.rows[0],
          triage:            triageToday.rows[0],
          consultations:     parseInt(consultationsToday.rows[0].total),
          admissions:        admissions.rows[0],
        },
        // Financial
        revenue: {
          today:       parseFloat(revenueToday.rows[0].total),
          today_txns:  parseInt(revenueToday.rows[0].transactions),
          week:        parseFloat(revenueWeek.rows[0].total),
          month:       parseFloat(revenueMonth.rows[0].total),
          pending_count:   parseInt(pendingBills.rows[0].count),
          pending_balance: parseFloat(pendingBills.rows[0].total_balance),
        },
        // Inventory alerts
        inventory: {
          low_stock:      parseInt(lowStock.rows[0].count),
          expiring_drugs: parseInt(expiringDrugs.rows[0].count),
        },
        // Charts
        weekly_opd:    weeklyOPD.rows,
        monthly_trend: monthlyTrend.rows,
        bed_occupancy: bedOccupancy.rows,
        // Lists
        recent_patients: recentPatients.rows,
        recent_activity: recentActivity.rows,
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/kpis — quick KPIs only (lightweight)
router.get('/kpis', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM patients WHERE is_deleted=FALSE)                  AS total_patients,
        (SELECT COUNT(*) FROM visits WHERE visit_date=CURRENT_DATE)             AS visits_today,
        (SELECT COUNT(*) FROM visits WHERE visit_date=CURRENT_DATE
           AND patient_type='Outpatient')                                       AS opd_today,
        (SELECT COUNT(*) FROM admissions WHERE status='Admitted')               AS inpatients,
        (SELECT COALESCE(SUM(amount),0) FROM payments
           WHERE payment_date=CURRENT_DATE)                                     AS revenue_today,
        (SELECT COUNT(*) FROM lab_requests
           WHERE requested_at::date=CURRENT_DATE)                               AS lab_today,
        (SELECT COUNT(*) FROM drug_stock WHERE quantity < min_quantity)         AS low_stock,
        (SELECT COUNT(*) FROM invoices WHERE status IN ('Pending','Partial'))   AS pending_bills,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date=CURRENT_DATE
           AND status='Scheduled')                                              AS appointments_today,
        (SELECT COUNT(*) FROM triage WHERE triaged_at::date=CURRENT_DATE)       AS triaged_today,
        (SELECT COUNT(*) FROM consultations WHERE consultation_date=CURRENT_DATE) AS consultations_today,
        (SELECT COUNT(*) FROM users WHERE is_active=TRUE)                       AS active_users
    `);
    res.json({ success: true, kpis: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/trend?period=year|month|week|daily
// Visit volume trend bucketed by the requested period.
router.get('/trend', async (req, res) => {
  const period = ['year', 'month', 'week', 'daily'].includes(req.query.period)
    ? req.query.period
    : 'month';
  try {
    let query;
    if (period === 'year') {
      query = `
        SELECT TO_CHAR(DATE_TRUNC('year', visit_date), 'YYYY') AS label,
               COUNT(CASE WHEN patient_type='Outpatient' THEN 1 END) AS opd,
               COUNT(CASE WHEN patient_type='Inpatient'  THEN 1 END) AS ipd
        FROM visits
        WHERE visit_date >= DATE_TRUNC('year', NOW()) - INTERVAL '4 years'
        GROUP BY DATE_TRUNC('year', visit_date)
        ORDER BY DATE_TRUNC('year', visit_date)`;
    } else if (period === 'month') {
      query = `
        SELECT TO_CHAR(DATE_TRUNC('month', visit_date), 'Mon') AS label,
               COUNT(CASE WHEN patient_type='Outpatient' THEN 1 END) AS opd,
               COUNT(CASE WHEN patient_type='Inpatient'  THEN 1 END) AS ipd
        FROM visits
        WHERE visit_date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', visit_date)
        ORDER BY DATE_TRUNC('month', visit_date)`;
    } else if (period === 'week') {
      query = `
        SELECT 'W/c ' || TO_CHAR(DATE_TRUNC('week', visit_date), 'DD Mon') AS label,
               COUNT(CASE WHEN patient_type='Outpatient' THEN 1 END) AS opd,
               COUNT(CASE WHEN patient_type='Inpatient'  THEN 1 END) AS ipd
        FROM visits
        WHERE visit_date >= DATE_TRUNC('week', NOW()) - INTERVAL '7 weeks'
        GROUP BY DATE_TRUNC('week', visit_date)
        ORDER BY DATE_TRUNC('week', visit_date)`;
    } else {
      query = `
        SELECT TO_CHAR(visit_date, 'Dy') AS label,
               COUNT(CASE WHEN patient_type='Outpatient' THEN 1 END) AS opd,
               COUNT(CASE WHEN patient_type='Inpatient'  THEN 1 END) AS ipd
        FROM visits
        WHERE visit_date >= CURRENT_DATE - INTERVAL '13 days'
        GROUP BY visit_date
        ORDER BY visit_date`;
    }
    const result = await pool.query(query);
    res.json({ success: true, period, trend: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/opd-by-age?period=week|daily
// Weekly OPD visits split by age band (<5 years vs >=5 years).
router.get('/opd-by-age', async (req, res) => {
  const days = req.query.period === 'daily' ? 1 : 7;
  try {
    const result = await pool.query(
      `SELECT v.visit_date,
              COUNT(CASE WHEN DATE_PART('year', AGE(v.visit_date, p.date_of_birth)) < 5 THEN 1 END) AS under_five,
              COUNT(CASE WHEN DATE_PART('year', AGE(v.visit_date, p.date_of_birth)) >= 5 OR p.date_of_birth IS NULL THEN 1 END) AS over_five
       FROM visits v
       JOIN patients p ON p.id = v.patient_id
       WHERE v.visit_date >= CURRENT_DATE - INTERVAL '${days === 1 ? 0 : 6} days'
         AND v.patient_type = 'Outpatient'
       GROUP BY v.visit_date
       ORDER BY v.visit_date`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/staff-on-duty
// Active staff whose shift matches the current time of day (heuristic: 06:00–18:00 = Day shift).
router.get('/staff-on-duty', async (req, res) => {
  try {
    const hour = new Date().getHours();
    const currentShift = (hour >= 6 && hour < 18) ? 'Day' : 'Night';
    const result = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.shift,
              r.name AS role_name, d.name AS department_name
       FROM staff s
       LEFT JOIN roles r ON r.id = s.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.status = 'Active'
         AND (s.shift = $1 OR s.shift = 'Rotating')
       ORDER BY s.first_name
       LIMIT 8`,
      [currentShift]
    );
    res.json({ success: true, shift: currentShift, staff: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;