// TibaMax HMIS - API Connection
import axios from 'axios';

// --- Global auth interceptor ---------------------------------------------
// Attaches the JWT to every outgoing request, whether it's made through the
// `API` instance below or via a plain `import axios from 'axios'` elsewhere
// in the app (layout.js, dashboard page, etc.). Without this, every request
// silently fails with 401 now that the backend requires a token on almost
// every route.
function attachAuthInterceptors(instance) {
  instance.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tibamax_token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response?.status === 401 &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        localStorage.removeItem('tibamax_token');
        localStorage.removeItem('tibamax_user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

attachAuthInterceptors(axios); // plain axios usages app-wide

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});
attachAuthInterceptors(API); // patientAPI, visitAPI, etc. below

// Patients
export const patientAPI = {
  getAll:         (params) => API.get('/patients', { params }),
  search:         (q) => API.get('/patients/search', { params: { q } }),
  getById:        (id) => API.get(`/patients/${id}`),
  getByPatientNo: (no) => API.get(`/patients/no/${no}`),
  getFamilyByPhone:(phone) => API.get(`/patients/family/${phone}`),
  create:         (data) => API.post('/patients', data),
  update:         (id, data) => API.put(`/patients/${id}`, data),
  delete:         (id) => API.delete(`/patients/${id}`),
  restore:        (id) => API.put(`/patients/${id}/restore`),
};

// Visits
export const visitAPI = {
  getToday:       (params) => API.get('/visits/today', { params }),
  getDashboard:   () => API.get('/visits/dashboard'),
  getById:        (id) => API.get(`/visits/${id}`),
  getHistory:     (patient_id) => API.get(`/visits/patient/${patient_id}`),
  startNew:       (data) => API.post('/visits/new', data),
  continueVisit:  (data) => API.post('/visits/continue', data),
  updateStage:    (id, stage) => API.put(`/visits/${id}/stage`, { stage }),
  discharge:      (id, data) => API.put(`/visits/${id}/discharge`, data),
  // Look-up (daily front-desk workspace)
  lookup:         (params) => API.get('/visits/lookup', { params }),
  moveLocation:   (id, location) => API.put(`/visits/${id}/move`, { location }),
  deleteVisit:    (id) => API.delete(`/visits/${id}`),
};

// Staff
export const staffAPI = {
  getAll:         () => API.get('/staff'),
  getById:        (id) => API.get(`/staff/${id}`),
  create:         (data) => API.post('/staff', data),
  update:         (id, data) => API.put(`/staff/${id}`, data),
  getRoles:       () => API.get('/staff/meta/roles'),
  getDepartments: () => API.get('/staff/meta/departments'),
};

// Laboratory
export const labAPI = {
  getAll:         () => API.get('/laboratory'),
  getToday:       () => API.get('/laboratory/today'),
  getById:        (id) => API.get(`/laboratory/${id}`),
  create:         (data) => API.post('/laboratory', data),
  enterResults:   (id, results) => API.put(`/laboratory/${id}/results`, { results }),
  getTests:       () => API.get('/laboratory/meta/tests'),
};

// Pharmacy
export const pharmacyAPI = {
  getStock:       (store) => API.get('/pharmacy/stock', { params: { store } }),
  getLowStock:    () => API.get('/pharmacy/stock/low'),
  getExpiring:    () => API.get('/pharmacy/stock/expiring'),
  getPrescriptions: () => API.get('/pharmacy/prescriptions'),
  getDrugs:       () => API.get('/pharmacy/drugs'),
  addStock:       (data) => API.post('/pharmacy/stock', data),
  createPrescription: (data) => API.post('/pharmacy/prescriptions', data),
};

// Billing
export const billingAPI = {
  getAll:         () => API.get('/billing'),
  getPending:     () => API.get('/billing/pending'),
  getRevenue:     () => API.get('/billing/revenue'),
  getById:        (id) => API.get(`/billing/${id}`),
  getVisitCharges: (visitId) => API.get(`/billing/charges/visit/${visitId}`),
  create:         (data) => API.post('/billing', data),
  recordPayment:  (id, data) => API.post(`/billing/${id}/payment`, data),
  getPaymentMethods: () => API.get('/billing/meta/payment-methods'),
};

// Appointments
export const appointmentAPI = {
  getAll:         (params) => API.get('/appointments', { params }),
  getToday:       () => API.get('/appointments/today'),
  create:         (data) => API.post('/appointments', data),
  updateStatus:   (id, data) => API.put(`/appointments/${id}/status`, data),
};

// Reports
export const reportAPI = {
  getDashboard:   () => API.get('/reports/dashboard'),
  getOPD:         () => API.get('/reports/opd'),
  getRevenue:     () => API.get('/reports/revenue'),
  getLab:         () => API.get('/reports/laboratory'),
  getInventory:   () => API.get('/reports/inventory'),
  getPatients:    () => API.get('/reports/patients'),
};
// Triage
export const triageAPI = {
  getByVisit:  (visit_id) => API.get(`/triage/visit/${visit_id}`),
  getToday:    () => API.get('/triage/today'),
  getPending:  () => API.get('/triage/pending'),
  create:      (data) => API.post('/triage', data),
};
// Consultation
export const consultationAPI = {
  getQueue:   () => API.get('/consultation/queue'),
  getByVisit: (visit_id) => API.get(`/consultation/visit/${visit_id}`),
  getHistory: (patient_id) => API.get(`/consultation/patient/${patient_id}/history`),
  create:     (data) => API.post('/consultation', data),
};
// Inpatient
export const inpatientAPI = {
  getWards:       () => API.get('/inpatient/wards'),
  getWardBeds:    (ward_id) => API.get(`/inpatient/wards/${ward_id}/beds`),
  createWard:     (data) => API.post('/inpatient/wards', data),
  getAdmissions:  (status) => API.get('/inpatient/admissions', { params: { status } }),
  getAdmission:   (id) => API.get(`/inpatient/admissions/${id}`),
  admit:          (data) => API.post('/inpatient/admissions', data),
  addNote:        (id, data) => API.post(`/inpatient/admissions/${id}/notes`, data),
  discharge:      (id, data) => API.put(`/inpatient/admissions/${id}/discharge`, data),
  getWardTypes:   () => API.get('/inpatient/ward-types'),
};
export default API;