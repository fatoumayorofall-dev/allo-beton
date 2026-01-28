const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase(userId) {
  try {
    console.log('🌱 Insertion des données d\'exemple...');
    
    // Insérer les catégories
    const categories = [
      { name: 'Béton Standard', description: 'Bétons pour usage général et fondations' },
      { name: 'Béton Haute Performance', description: 'Bétons haute résistance pour structures' },
      { name: 'Béton Spécialisé', description: 'Bétons pour applications spécifiques' },
      { name: 'Additifs et Adjuvants', description: 'Produits chimiques pour améliorer le béton' },
      { name: 'Matériaux de Construction', description: 'Sable, gravier, ciment et autres matériaux' },
      { name: 'Outils et Équipements', description: 'Outils pour la construction et le béton' }
    ];
    
    const categoryIds = {};
    for (const cat of categories) {
      const catId = uuidv4();
      await pool.execute(
        'INSERT INTO categories (id, user_id, name, description) VALUES (?, ?, ?, ?)',
        [catId, userId, cat.name, cat.description]
      );
      categoryIds[cat.name] = catId;
    }
    
    // Insérer les fournisseurs
    const suppliers = [
      {
        name: 'Ciments du Sénégal SARL',
        email: 'commercial@ciments-senegal.sn',
        phone: '33 821 45 67',
        address: 'Zone Industrielle de Rufisque, BP 3270',
        city: 'Rufisque',
        contact_person: 'Amadou Diallo',
        notes: 'Principal fournisseur de ciment Portland'
      },
      {
        name: 'Carrières de Diack',
        email: 'info@carrieres-diack.sn',
        phone: '33 955 12 34',
        address: 'Route de Thiès, Diack',
        city: 'Thiès',
        contact_person: 'Ibrahima Sarr',
        notes: 'Fournisseur de granulats et sable'
      },
      {
        name: 'SOCOCIM Industries',
        email: 'contact@sococim.sn',
        phone: '33 832 15 20',
        address: 'Bargny, Rufisque',
        city: 'Rufisque',
        contact_person: 'Fatou Ndiaye',
        notes: 'Cimenterie moderne avec livraison rapide'
      },
      {
        name: 'Additifs Chimiques SARL',
        email: 'vente@additifs-chimiques.sn',
        phone: '77 333 44 55',
        address: '45 Rue des Industries, Zone B',
        city: 'Dakar',
        contact_person: 'Aïssatou Ndiaye',
        notes: 'Spécialiste des adjuvants pour béton'
      }
    ];
    
    const supplierIds = [];
    for (const supplier of suppliers) {
      const supplierId = uuidv4();
      await pool.execute(
        'INSERT INTO suppliers (id, user_id, name, email, phone, address, city, contact_person, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [supplierId, userId, supplier.name, supplier.email, supplier.phone, supplier.address, supplier.city, supplier.contact_person, supplier.notes]
      );
      supplierIds.push(supplierId);
    }
    
    // Insérer les clients
    const customers = [
      {
        name: 'Mamadou Diop',
        email: 'mamadou.diop@construction-diop.sn',
        phone: '77 123 45 67',
        address: 'Cité Keur Gorgui, Villa N°45',
        city: 'Dakar',
        company: 'Construction Diop & Fils',
        credit_limit: 5000000,
        notes: 'Client fidèle depuis 2018'
      },
      {
        name: 'Aïssatou Ba',
        email: 'aissatou.ba@batiment-ba.sn',
        phone: '76 987 65 43',
        address: 'Quartier HLM, Immeuble 12',
        city: 'Thiès',
        company: 'Entreprise Ba Construction',
        credit_limit: 8000000,
        notes: 'Spécialisée dans les grands projets'
      },
      {
        name: 'Cheikh Ndiaye',
        email: 'cheikh.ndiaye@ndiaye-btp.sn',
        phone: '78 112 233 44',
        address: 'Médina, Rue 15 x 20',
        city: 'Saint-Louis',
        company: 'Ndiaye BTP',
        credit_limit: 3000000,
        notes: 'Projets résidentiels principalement'
      },
      {
        name: 'Fatou Seck',
        email: 'fatou.seck@seck-construction.sn',
        phone: '77 555 66 77',
        address: 'Parcelles Assainies, Unité 25',
        city: 'Dakar',
        company: 'Seck Construction SARL',
        credit_limit: 12000000,
        notes: 'Gros volumes, paiements réguliers'
      },
      {
        name: 'Ousmane Fall',
        email: 'ousmane.fall@fall-batiment.sn',
        phone: '76 444 55 66',
        address: 'Kaolack Centre, Avenue Valdiodio',
        city: 'Kaolack',
        company: 'Fall Bâtiment',
        credit_limit: 7500000,
        notes: 'Projets publics et privés'
      }
    ];
    
    const customerIds = [];
    for (const customer of customers) {
      const customerId = uuidv4();
      await pool.execute(
        'INSERT INTO customers (id, user_id, name, email, phone, address, city, company, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [customerId, userId, customer.name, customer.email, customer.phone, customer.address, customer.city, customer.company, customer.credit_limit, customer.notes]
      );
      customerIds.push(customerId);
    }
    
    // Insérer les produits
    const products = [
      {
        name: 'Béton C25/30 Standard',
        description: 'Béton dosé à 350kg/m³ pour fondations et dalles. Résistance caractéristique 25 MPa.',
        sku: 'BET-C25-001',
        category: 'Béton Standard',
        cost_price: 65000,
        selling_price: 75000,
        unit: 'm³',
        stock: 50,
        min_stock: 10
      },
      {
        name: 'Béton C30/37 Haute Résistance',
        description: 'Béton haute performance pour poteaux et poutres. Résistance 30 MPa.',
        sku: 'BET-C30-002',
        category: 'Béton Haute Performance',
        cost_price: 75000,
        selling_price: 85000,
        unit: 'm³',
        stock: 25,
        min_stock: 8
      },
      {
        name: 'Béton Fibré Industriel',
        description: 'Béton renforcé de fibres métalliques pour sols industriels et parkings.',
        sku: 'BET-FIB-003',
        category: 'Béton Spécialisé',
        cost_price: 95000,
        selling_price: 110000,
        unit: 'm³',
        stock: 15,
        min_stock: 5
      },
      {
        name: 'Béton Autoplaçant BAP',
        description: 'Béton autoplaçant pour structures complexes sans vibration.',
        sku: 'BET-BAP-004',
        category: 'Béton Spécialisé',
        cost_price: 105000,
        selling_price: 125000,
        unit: 'm³',
        stock: 12,
        min_stock: 4
      },
      {
        name: 'Plastifiant Réducteur d\'Eau',
        description: 'Adjuvant pour améliorer l\'ouvrabilité du béton et réduire l\'eau.',
        sku: 'ADJ-PLA-005',
        category: 'Additifs et Adjuvants',
        cost_price: 12000,
        selling_price: 15000,
        unit: 'L',
        stock: 100,
        min_stock: 20
      },
      {
        name: 'Accélérateur de Prise',
        description: 'Adjuvant pour accélérer le durcissement du béton en hiver.',
        sku: 'ADJ-ACC-006',
        category: 'Additifs et Adjuvants',
        cost_price: 18000,
        selling_price: 22000,
        unit: 'kg',
        stock: 8,
        min_stock: 15
      },
      {
        name: 'Sable de Rivière Lavé 0/4',
        description: 'Sable fin lavé pour mortier et béton, granulométrie 0/4 mm.',
        sku: 'MAT-SAB-007',
        category: 'Matériaux de Construction',
        cost_price: 8000,
        selling_price: 12000,
        unit: 'm³',
        stock: 200,
        min_stock: 50
      },
      {
        name: 'Gravier Concassé 5/15',
        description: 'Gravier concassé pour béton, granulométrie 5/15 mm.',
        sku: 'MAT-GRA-008',
        category: 'Matériaux de Construction',
        cost_price: 10000,
        selling_price: 15000,
        unit: 'm³',
        stock: 150,
        min_stock: 40
      },
      {
        name: 'Ciment Portland CEM I 42.5',
        description: 'Ciment Portland haute qualité pour tous types de béton.',
        sku: 'MAT-CIM-009',
        category: 'Matériaux de Construction',
        cost_price: 4500,
        selling_price: 5500,
        unit: 'sac 50kg',
        stock: 500,
        min_stock: 100
      },
      {
        name: 'Pompe à Béton Mobile',
        description: 'Location pompe à béton pour chantiers difficiles d\'accès.',
        sku: 'EQP-POM-010',
        category: 'Outils et Équipements',
        cost_price: 45000,
        selling_price: 65000,
        unit: 'jour',
        stock: 3,
        min_stock: 1
      }
    ];
    
    for (const product of products) {
      const productId = uuidv4();
      const categoryId = categoryIds[product.category];
      const supplierId = supplierIds[Math.floor(Math.random() * supplierIds.length)];
      
      await pool.execute(
        'INSERT INTO products (id, user_id, name, description, sku, category_id, supplier_id, cost_price, selling_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, userId, product.name, product.description, product.sku, categoryId, supplierId, product.cost_price, product.selling_price, product.unit]
      );
      
      // Créer l'entrée d'inventaire
      await pool.execute(
        'INSERT INTO inventory_items (id, user_id, product_id, quantity, min_stock_level, reorder_point, last_received_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [uuidv4(), userId, productId, product.stock, product.min_stock, product.min_stock]
      );
    }
    
    // Créer quelques ventes d'exemple
    await createSampleSales(userId, customerIds, categoryIds);
    
    console.log('✅ Données d\'exemple insérées avec succès!');
    console.log('📊 Résumé:');
    console.log(`   - ${categories.length} catégories`);
    console.log(`   - ${suppliers.length} fournisseurs`);
    console.log(`   - ${customers.length} clients`);
    console.log(`   - ${products.length} produits`);
    console.log('   - 3 ventes d\'exemple');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données:', error);
    throw error;
  }
}

async function createSampleSales(userId, customerIds, categoryIds) {
  // Récupérer quelques produits
  const [products] = await pool.execute(
    'SELECT id, name, selling_price FROM products WHERE user_id = ? LIMIT 5',
    [userId]
  );
  
  if (products.length === 0) return;
  
  // Créer 3 ventes d'exemple
  for (let i = 0; i < 3; i++) {
    const saleId = uuidv4();
    const customerId = customerIds[i % customerIds.length];
    const saleNumber = `VTE-${Date.now()}-${i + 1}`;
    
    // Calculer les totaux
    const selectedProducts = products.slice(0, 2 + i);
    let subtotal = 0;
    
    const saleItems = selectedProducts.map(product => {
      const quantity = 5 + Math.floor(Math.random() * 10);
      const lineTotal = quantity * product.selling_price;
      subtotal += lineTotal;
      
      return {
        product_id: product.id,
        quantity,
        unit_price: product.selling_price,
        line_total: lineTotal
      };
    });
    
    const taxAmount = subtotal * 0.18; // 18% TVA
    const totalAmount = subtotal + taxAmount;
    
    // Créer la vente
    await pool.execute(
      `INSERT INTO sales (id, user_id, customer_id, sale_number, status, sale_date, subtotal, tax_amount, total_amount, payment_status) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [saleId, userId, customerId, saleNumber, 'confirmed', subtotal, taxAmount, totalAmount, 'paid']
    );
    
    // Créer les articles de vente
    for (const item of saleItems) {
      await pool.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, tax_rate, line_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), saleId, item.product_id, item.quantity, item.unit_price, 18.00, item.line_total]
      );
    }
    
    // Créer un paiement
    const paymentId = uuidv4();
    const paymentNumber = `PAY-${Date.now()}-${i + 1}`;
    
    await pool.execute(
      `INSERT INTO payments (id, user_id, sale_id, payment_number, amount, payment_method, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, userId, saleId, paymentNumber, totalAmount, 'bank_transfer', 'completed']
    );
  }
}

// Fonction pour obtenir l'ID de l'admin
async function getAdminId() {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );
    
    if (rows.length === 0) {
      throw new Error('Aucun utilisateur admin trouvé. Exécutez d\'abord les migrations avec "npm run migrate".');
    }
    
    return rows[0].id;
  } catch (error) {
    console.error('❌ Erreur récupération admin:', error);
    throw error;
  }
}

// Exécuter le seeding si ce script est appelé directement
if (require.main === module) {
  getAdminId()
    .then(adminId => seedDatabase(adminId))
    .then(() => {
      console.log('🎉 Données d\'exemple créées avec succès!');
      console.log('🚀 Vous pouvez maintenant démarrer le serveur avec "npm run dev"');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Échec du seeding:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };