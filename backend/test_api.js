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
      console.log('✅ Status:', json.success);
      console.log('📝 Nombre de paiements:', json.data ? json.data.length : 0);
      if (json.data && json.data.length > 0) {
        console.log('\n📊 Premier paiement:');
        const p = json.data[0];
        console.log(`  - payment_number: ${p.payment_number}`);
        console.log(`  - amount: ${p.amount} (type: ${typeof p.amount})`);
        console.log(`  - status: ${p.status}`);
        console.log(`  - customer_name: ${p.customer_name}`);
        console.log(`  - sale_number: ${p.sale_number}`);
      }
    } catch (e) {
      console.error('❌ Erreur:', e.message);
    }
    process.exit(0);
  });
});
req.on('error', (e) => { 
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
req.end();
