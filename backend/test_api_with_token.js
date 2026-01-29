const jwt = require('jsonwebtoken');
const http = require('http');

// Créer un token JWT valide
const secret = '123456789012345678901234567890123456789012345678901234567890';
const token = jwt.sign(
  { 
    userId: 'afb42cd5-8f79-11f0-8b9b-a059505fd042',
    email: 'admin@allobeton.sn',
    role: 'admin'
  }, 
  secret,
  { expiresIn: '24h' }
);

console.log('🔑 Token généré:', token);
console.log('\n📊 Envoi de la requête...\n');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/payments',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
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
      if (json.data) {
        console.log(`📝 Nombre de paiements: ${json.data.length}`);
        if (json.data.length > 0) {
          console.log('\n💰 Détails du premier paiement:');
          const p = json.data[0];
          console.log(`  - payment_number: ${p.payment_number}`);
          console.log(`  - amount: ${p.amount}`);
          console.log(`  - status: ${p.status}`);
          console.log(`  - customer_name: ${p.customer_name}`);
          
          console.log('\n📊 Calcul des totaux:');
          const total = json.data.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
          const completed = json.data.filter(p => p.status === 'completed').length;
          console.log(`  - Encaissements totaux: ${total.toLocaleString()} FCFA`);
          console.log(`  - Paiements complétés: ${completed}`);
        }
      } else {
        console.log('❌ Pas de données:', json.error);
      }
    } catch (e) {
      console.error('❌ Erreur parsing:', e.message);
      console.log('Réponse:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => { 
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});

req.end();
