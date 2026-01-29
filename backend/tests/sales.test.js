const request = require('supertest');
const { pool } = require('../config/database');

describe('Sales API Integration Tests', () => {
  let app;
  let authToken;
  let customerId;
  let productId;

  beforeAll(async () => {
    app = require('../server');
    
    // Login as test user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@allobeton.sn', password: 'admin123' });
    
    authToken = loginRes.body.data?.token;
    
    // Get a customer ID
    const customersRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${authToken}`);
    
    customerId = customersRes.body.data?.[0]?.id || '550e8400-e29b-41d4-a716-446655440000';
    
    // Get a product ID
    const productsRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);
    
    productId = productsRes.body.data?.[0]?.id || '550e8400-e29b-41d4-a716-446655440001';
  });

  describe('POST /api/sales', () => {
    it('should create a sale with transport fields', async () => {
      const saleData = {
        customerId,
        items: [{ productId, quantity: 10, price: 50000 }],
        deliveryDate: new Date().toISOString(),
        status: 'draft',
        notes: 'Test sale',
        vehiclePlate: 'SN-123-ABC',
        driverName: 'Moussa Diop',
        productType: 'ARGILE (SF180)',
        loadingLocation: 'SARAYA',
        destination: 'USINE SINDIA',
        dischargeTime: new Date().toISOString(),
        weightLoaded: 52.47
      };

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject invalid sale data', async () => {
      const invalidData = {
        customerId,
        items: [], // Empty items should fail
        deliveryDate: new Date().toISOString()
      };

      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toBeDefined();
    });
  });

  describe('GET /api/sales', () => {
    it('should retrieve sales with pagination', async () => {
      const res = await request(app)
        .get('/api/sales?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should filter sales by status', async () => {
      const res = await request(app)
        .get('/api/sales?status=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales).toBeDefined();
      expect(Array.isArray(res.body.data.sales)).toBe(true);
    });

    it('should search sales by number', async () => {
      const res = await request(app)
        .get('/api/sales?search=VTE')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sales).toBeDefined();
    });
  });

  describe('PUT /api/sales/:id', () => {
    it('should update sale status and transport fields', async () => {
      // First create a sale
      const saleRes = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          items: [{ productId, quantity: 5, price: 50000 }],
          status: 'draft'
        });

      const saleId = saleRes.body.data.id;

      // Then update it
      const updateRes = await request(app)
        .put(`/api/sales/${saleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'confirmed',
          vehicle_plate: 'SN-999-XYZ',
          driver_name: 'Ahmed Sall',
          weight_loaded: 100
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
    });
  });

  describe('POST /api/sales/import/preview', () => {
    it('should parse CSV file and return headers + rows', async () => {
      const csvContent = `N°FACTURE,DATE,HEURE,MATRICULE,NOM CHAUFFEUR,TYPE PRODUIT,LIEU CHARGEMENT,DESTINATION,POIDS CHARGEMENT
VTE-001,05/01/2026,13h23,WS2026010500033,AA 077 FW,BOUBOU GUEYE,ARGILE (SF180),SARAYA,USINE SINDIA,52,47
VTE-002,05/01/2026,13h10,WS2026010500034,AA 878 JF,MOUSTAPHIA LOUM,ARGILE (SF180),SARAYA,USINE SINDIA,51,4`;

      const res = await request(app)
        .post('/api/sales/import/preview')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.headers).toBeDefined();
      expect(res.body.data.rows).toBeDefined();
      expect(res.body.data.rows.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/sales/import', () => {
    it('should import sales with mapping', async () => {
      const importData = {
        rows: [
          {
            'N°FACTURE': 'VTE-100',
            'DATE': '05/01/2026',
            'MATRICULE': 'SN-100-ABC',
            'NOM CHAUFFEUR': 'Test Driver',
            'TYPE PRODUIT': 'ARGILE',
            'DESTINATION': 'DAKAR'
          }
        ],
        mapping: {
          saleNumberHeader: 'N°FACTURE',
          dateHeader: 'DATE',
          vehiclePlateHeader: 'MATRICULE',
          driverNameHeader: 'NOM CHAUFFEUR',
          productTypeHeader: 'TYPE PRODUIT',
          destinationHeader: 'DESTINATION'
        }
      };

      const res = await request(app)
        .post('/api/sales/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send(importData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBeDefined();
      expect(res.body.data.created.length).toBeGreaterThan(0);
    });
  });
});
