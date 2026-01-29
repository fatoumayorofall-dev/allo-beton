const https = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/payments',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLWlkIiwiZW1haWwiOiJhZG1pbkBhbGxvYmV0b24uc24iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDB9.invalid',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Paiements reçus:', json.success);
      console.log('📊 Nombre:', json.data ? json.data.length : 0);
      if (json.data && json.data.length > 0) {
        console.log('📝 Premier paiement:', json.data[0]);
      }
    } catch (e) {
      console.error('❌ Erreur parsing:', e.message);
      console.log('Réponse brute:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur requête:', e.message);
});

req.end();
