const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/payments',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLWlkIiwiZW1haWwiOiJhZG1pbkBhbGxvYmV0b24uc24iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDAwMDAwMDB9.invalid',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('📊 Réponse complète:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('❌ Erreur parsing:', e.message);
      console.log('Réponse brute:', data);
    }
    process.exit(0);
  });
});
req.on('error', (e) => { 
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
req.end();
