require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pool = require('./config/db');
const app = express();
const PORT = process.env.PORT || 5000;
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.json({ system: 'AfyaTab HMIS', version: '1.0.0', status: 'Running' });
});
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({ system: 'AfyaTab HMIS', status: 'Healthy', database: 'afyatab_hmis', server_time: result.rows[0].server_time, node_version: process.version });
  } catch (err) {
    res.status(500).json({ status: 'Unhealthy', error: err.message });
  }
});
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/superadmin',     require('./routes/superadmin'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/patients',       require('./routes/patients'));
app.use('/api/visits',         require('./routes/visits'));
app.use('/api/triage',         require('./routes/triage'));
app.use('/api/consultation',   require('./routes/consultation'));
app.use('/api/inpatient',      require('./routes/inpatient'));
app.use('/api/staff',          require('./routes/staff'));
app.use('/api/laboratory',     require('./routes/laboratory'));
app.use('/api/pharmacy',       require('./routes/pharmacy'));
app.use('/api/billing',        require('./routes/billing'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/reports',        require('./routes/reports'));
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
app.listen(PORT, () => {
  console.log('============================================');
  console.log('   AfyaTab HMIS - Backend API');
  console.log('============================================');
  console.log('   Status : Running');
  console.log('   Port   : ' + PORT);
  console.log('   URL    : http://localhost:' + PORT);
  console.log('============================================');
});