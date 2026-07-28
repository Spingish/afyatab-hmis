-- Super Admin staff + user seed

INSERT INTO staff (staff_no, first_name, last_name, gender, phone, department_id, role_id, shift, hire_date, status)
SELECT 'S002', 'Super', 'Admin', 'Other', '0700000001',
       (SELECT id FROM departments WHERE code = 'ADMIN'),
       (SELECT id FROM roles WHERE name = 'Super Admin'),
       'Day', CURRENT_DATE, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE staff_no = 'S002');

INSERT INTO users (staff_id, username, password_hash, role_id, is_active)
SELECT id, 'superadmin', 'SuperAdmin@2026',
       (SELECT id FROM roles WHERE name = 'Super Admin'), TRUE
FROM staff WHERE staff_no = 'S002'
ON CONFLICT (username) DO NOTHING;