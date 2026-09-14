const axios = require('axios');
const API_BASE = 'https://api-script-labs.hendri.me';

describe('API Script Labs - Automation Suite', () => {
  let authToken = '';

  // Teknik: Decision Table & State Transition
  describe('Auth Features - /auth/login', () => {
    test('Positive Case: Login sukses dengan kredensial valid (Decision Table)', async () => {
      // Catatan: Ganti dengan kredensial valid di database Anda
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: 'tester@hendri.me', 
        password: 'PasswordValid123'
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('token');
      authToken = res.data.token;
    });

    test('Negative Case: Login gagal kredensial salah (Decision Table)', async () => {
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'tester@hendri.me',
          password: 'wrongpassword'
        });
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  // Teknik: BVA & EP
  describe('CRUD Labs & Pagination - /labs', () => {
    test('Negative Case: Gagal membuat lab dengan title 0 karakter (BVA)', async () => {
      try {
        await axios.post(`${API_BASE}/labs`, 
          { title: '', description: 'Test setup' }, 
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toMatch(/title/i);
      }
    });

    test('Positive Case: Mengambil data lab dengan limit 10 (EP)', async () => {
      const res = await axios.get(`${API_BASE}/labs?page=1&limit=10`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeLessThanOrEqual(10);
    });
  });
});