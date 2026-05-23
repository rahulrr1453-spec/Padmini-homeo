// server.js - Backend API for Clinic Records App
// Install dependencies: npm install express pg cors dotenv body-parser

// DNS lookup override to bypass ISP blocking for Neon database
const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname && hostname.includes('neon.tech')) {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, options, callback);
      }
      if (options.all) {
        callback(null, addresses.map(addr => ({ address: addr, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
  } else {
    originalLookup(hostname, options, callback);
  }
};

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('✅ Connected to Neon PostgreSQL database');
  release();
});

// Initialize database tables
const initDB = async () => {
  const createPatientsTable = `
    CREATE TABLE IF NOT EXISTS patients (
      id VARCHAR(10) PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT NOW(),
      name VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      sex VARCHAR(10) NOT NULL,
      age INTEGER NOT NULL,
      marital_status VARCHAR(20),
      mobile VARCHAR(20) NOT NULL,
      occupation VARCHAR(100),
      family_history TEXT,
      place VARCHAR(200)
    );
  `;

  const createTestRecordsTable = `
    CREATE TABLE IF NOT EXISTS test_records (
      id SERIAL PRIMARY KEY,
      patient_id VARCHAR(10) REFERENCES patients(id) ON DELETE CASCADE,
      test_date DATE NOT NULL,
      test_name VARCHAR(200) NOT NULL,
      test_type VARCHAR(100),
      result TEXT,
      doctor_name VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createVisitsTable = `
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      patient_id VARCHAR(10) REFERENCES patients(id) ON DELETE CASCADE,
      doctor_name VARCHAR(100),
      visit_date TIMESTAMP DEFAULT NOW(),
      chief_complaints TEXT,
      medicines JSONB,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createAppointmentsTable = `
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id VARCHAR(10) REFERENCES patients(id) ON DELETE CASCADE,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      reason VARCHAR(200),
      status VARCHAR(20) DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createDoctorsTable = `
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      qualification VARCHAR(200) NOT NULL,
      mobile VARCHAR(20) NOT NULL,
      email VARCHAR(100) NOT NULL,
      secret_key VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(createDoctorsTable);
    await pool.query(createPatientsTable);
    await pool.query(createTestRecordsTable);
    await pool.query(createAppointmentsTable);
    await pool.query(createVisitsTable);
    console.log('✅ Database tables initialized');
    
    // Add columns or modify schema for existing tables
    try {
      await pool.query(`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS secret_key VARCHAR(100);`);
    } catch (err) {
      // Ignore if it already exists
    }
    try {
      await pool.query(`ALTER TABLE patients ALTER COLUMN marital_status DROP NOT NULL;`);
    } catch (err) {
      // Ignore if it's already done
    }
    try {
      await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS place VARCHAR(200);`);
    } catch (err) {
      // Ignore if it already exists
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};

initDB();

// ==================== PATIENT ROUTES ====================

// GET all patients
app.get('/api/patients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM patients ORDER BY timestamp DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET single patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM patients WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// POST new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, date, sex, age, marital_status, mobile, occupation, family_history, place, chief_complaints, doctor_name } = req.body;
    
    // Validation
    if (!id || !name || !date || !sex || age === undefined || age === null || !mobile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO patients (id, name, date, sex, age, marital_status, mobile, occupation, family_history, place)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, name, date, sex, age, marital_status, mobile, occupation, family_history, place]
    );

    if (chief_complaints) {
      await pool.query(
        `INSERT INTO visits (patient_id, doctor_name, visit_date, chief_complaints, medicines)
         VALUES ($1, $2, $3, $4, $5)`,
         [id, doctor_name || 'Unknown', date, chief_complaints, '[]']
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Patient ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create patient' });
    }
  }
});

// PUT update patient
app.put('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, sex, age, marital_status, mobile, occupation, family_history, place } = req.body;
    
    const result = await pool.query(
      `UPDATE patients 
       SET name = $1, date = $2, sex = $3, age = $4, marital_status = $5, 
           mobile = $6, occupation = $7, family_history = $8, place = $9
       WHERE id = $10
       RETURNING *`,
      [name, date, sex, age, marital_status, mobile, occupation, family_history, place, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// DELETE all patients
app.delete('/api/patients', async (req, res) => {
  try {
    await pool.query('DELETE FROM patients');
    res.json({ message: 'All patients deleted successfully' });
  } catch (error) {
    console.error('Error deleting all patients:', error);
    res.status(500).json({ error: 'Failed to delete all patients' });
  }
});

// POST bulk delete patients
app.post('/api/patients/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(`DELETE FROM patients WHERE id IN (${placeholders})`, ids);
    
    res.json({ message: `${ids.length} patients deleted successfully` });
  } catch (error) {
    console.error('Error deleting multiple patients:', error);
    res.status(500).json({ error: 'Failed to delete patients' });
  }
});

// DELETE patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM patients WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ message: 'Patient deleted successfully', patient: result.rows[0] });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// ==================== TEST RECORDS ROUTES ====================

// GET all test records
app.get('/api/test-records', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, p.name as patient_name, p.mobile as patient_mobile
       FROM test_records tr
       JOIN patients p ON tr.patient_id = p.id
       ORDER BY tr.test_date DESC, tr.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test records:', error);
    res.status(500).json({ error: 'Failed to fetch test records' });
  }
});

// GET test records for specific patient
app.get('/api/test-records/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await pool.query(
      'SELECT * FROM test_records WHERE patient_id = $1 ORDER BY test_date DESC',
      [patientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test records:', error);
    res.status(500).json({ error: 'Failed to fetch test records' });
  }
});

// POST new test record
app.post('/api/test-records', async (req, res) => {
  try {
    const { patient_id, test_date, test_name, test_type, result, doctor_name, notes } = req.body;
    
    const dbResult = await pool.query(
      `INSERT INTO test_records (patient_id, test_date, test_name, test_type, result, doctor_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [patient_id, test_date, test_name, test_type, result, doctor_name, notes]
    );
    
    res.status(201).json(dbResult.rows[0]);
  } catch (error) {
    console.error('Error creating test record:', error);
    res.status(500).json({ error: 'Failed to create test record' });
  }
});

// PUT update test record
app.put('/api/test-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { test_date, test_name, test_type, result, doctor_name, notes } = req.body;
    
    const dbResult = await pool.query(
      `UPDATE test_records 
       SET test_date = $1, test_name = $2, test_type = $3, result = $4, doctor_name = $5, notes = $6
       WHERE id = $7
       RETURNING *`,
      [test_date, test_name, test_type, result, doctor_name, notes, id]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test record not found' });
    }
    
    res.json(dbResult.rows[0]);
  } catch (error) {
    console.error('Error updating test record:', error);
    res.status(500).json({ error: 'Failed to update test record' });
  }
});

// DELETE test record
app.delete('/api/test-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM test_records WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test record not found' });
    }
    
    res.json({ message: 'Test record deleted successfully' });
  } catch (error) {
    console.error('Error deleting test record:', error);
    res.status(500).json({ error: 'Failed to delete test record' });
  }
});

// ==================== APPOINTMENTS ROUTES ====================

// GET all appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.name as patient_name, p.mobile
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET appointments for specific patient
app.get('/api/appointments/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await pool.query(
      'SELECT * FROM appointments WHERE patient_id = $1 ORDER BY appointment_date DESC',
      [patientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST new appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const { patient_id, appointment_date, appointment_time, reason, status, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO appointments (patient_id, appointment_date, appointment_time, reason, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patient_id, appointment_date, appointment_time, reason, status || 'scheduled', notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT update appointment
app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, appointment_time, reason, status, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE appointments 
       SET appointment_date = $1, appointment_time = $2, reason = $3, status = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [appointment_date, appointment_time, reason, status, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE appointment
app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// ==================== SEARCH & STATS ====================

// Search patients
app.get('/api/search/patients', async (req, res) => {
  try {
    const { query } = req.query;
    const result = await pool.query(
      `SELECT * FROM patients 
       WHERE name ILIKE $1 OR id ILIKE $1 OR mobile ILIKE $1
       ORDER BY timestamp DESC`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const patientsCount = await pool.query('SELECT COUNT(*) FROM patients');
    const testsCount = await pool.query('SELECT COUNT(*) FROM test_records');
    const appointmentsCount = await pool.query('SELECT COUNT(*) FROM appointments WHERE status = $1', ['scheduled']);
    
    res.json({
      totalPatients: parseInt(patientsCount.rows[0].count),
      totalTests: parseInt(testsCount.rows[0].count),
      upcomingAppointments: parseInt(appointmentsCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Clinic API is running' });
});

// Start server
// ==================== DOCTORS ROUTES ====================

// GET all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// POST a new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const { name, qualification, mobile, email, secret_key } = req.body;
    
    if (!name || !qualification || !mobile || !email || !secret_key) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO doctors (name, qualification, mobile, email, secret_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, qualification, mobile, email, secret_key]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
});

// DELETE a doctor
app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM doctors WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

// ==================== VISITS ROUTES ====================

// GET all visits for a specific patient
app.get('/api/patients/:id/visits', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM visits WHERE patient_id = $1 ORDER BY visit_date DESC, created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// POST a new visit
app.post('/api/visits', async (req, res) => {
  try {
    const { patient_id, doctor_name, chief_complaints, medicines, notes } = req.body;
    
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO visits (patient_id, doctor_name, chief_complaints, medicines, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patient_id, doctor_name || 'Unknown', chief_complaints || '', medicines ? JSON.stringify(medicines) : '[]', notes || '']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding visit:', error);
    res.status(500).json({ error: 'Failed to add visit' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});