const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer tous les fournisseurs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(DISTINCT sp.id) as products_count,
        COUNT(DISTINCT po.id) as orders_count
      FROM suppliers s
      LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.user_id = ? AND s.status = 'active'
      GROUP BY s.id
      ORDER BY s.name
    `, [req.user.id]);

    // Transformer les données pour correspondre au format frontend
    const transformedSuppliers = [];
    for (const supplier of suppliers) {
      // Récupérer les produits fournis
      const [products] = await pool.execute(
        'SELECT product_name FROM supplier_products WHERE supplier_id = ?',
        [supplier.id]
      );
      
      transformedSuppliers.push({
        ...supplier,
        contactPerson: supplier.contact_person,
        totalOrders: supplier.orders_count || 0,
        lastOrderDate: new Date().toISOString(),
        productsSupplied: products.map(p => p.product_name) || [],
        rating: supplier.rating || 5.0
      });
    }

    res.json({
      success: true,
      data: transformedSuppliers
    });

  } catch (error) {
    console.error('Erreur récupération fournisseurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des fournisseurs'
    });
  }
});

// Créer un nouveau fournisseur
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city = '',
      contactPerson = '',
      notes = '',
      productsSupplied = []
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du fournisseur est obligatoire'
      });
    }

    const supplierId = uuidv4();

    await pool.execute(
      `INSERT INTO suppliers (id, user_id, name, email, phone, address, city, contact_person, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [supplierId, req.user.id, name, email || '', phone || '', address || '', city, contactPerson || '', notes]
    );

    // Ajouter les produits fournis
    if (Array.isArray(productsSupplied) && productsSupplied.length > 0) {
      for (const product of productsSupplied) {
        if (product.trim()) {
          try {
            await pool.execute(
              'INSERT INTO supplier_products (id, supplier_id, product_name) VALUES (?, ?, ?)',
              [uuidv4(), supplierId, product.trim()]
            );
          } catch (err) {
            // Ignorer les doublons (UNIQUE constraint)
            if (err.code !== 'ER_DUP_ENTRY') {
              throw err;
            }
          }
        }
      }
    }

    // Récupérer le fournisseur créé
    const [newSupplier] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ?',
      [supplierId]
    );

    // Récupérer les produits fournis
    const [products] = await pool.execute(
      'SELECT product_name FROM supplier_products WHERE supplier_id = ?',
      [supplierId]
    );

    // Transformer pour correspondre au format frontend
    const supplier = newSupplier[0];
    const transformedSupplier = {
      ...supplier,
      contactPerson: supplier.contact_person,
      totalOrders: 0,
      lastOrderDate: new Date().toISOString(),
      productsSupplied: products.map(p => p.product_name),
      rating: 5
    };

    res.status(201).json({
      success: true,
      data: transformedSupplier
    });

  } catch (error) {
    console.error('Erreur création fournisseur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du fournisseur'
    });
  }
});

// Mettre à jour un fournisseur
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 PUT /suppliers/:id - ID:', id);
    console.log('📝 Request body:', JSON.stringify(req.body));
    console.log('📝 User ID:', req.user?.id);
    
    const {
      name,
      email,
      phone,
      address,
      city,
      contactPerson,
      rating,
      notes,
      productsSupplied = []
    } = req.body;

    console.log('📝 Fields provided:', { name, email, phone, address, city, contactPerson, rating, notes });

    // Construire dynamiquement la requête UPDATE avec UNIQUEMENT les champs fournis
    let updateFields = [];
    let updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (city !== undefined) {
      updateFields.push('city = ?');
      updateValues.push(city);
    }
    if (contactPerson !== undefined) {
      updateFields.push('contact_person = ?');
      updateValues.push(contactPerson);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (rating !== undefined && rating !== null) {
      updateFields.push('rating = ?');
      updateValues.push(rating);
    }

    // Toujours ajouter updated_at
    updateFields.push('updated_at = NOW()');

    // Vérifier qu'il y a au least un champ à mettre à jour
    if (updateFields.length === 1) {
      return res.status(400).json({
        success: false,
        error: 'Aucun champ à mettre à jour'
      });
    }

    updateValues.push(id, req.user.id);

    await pool.execute(
      `UPDATE suppliers 
       SET ${updateFields.join(', ')}
       WHERE id = ? AND user_id = ?`,
      updateValues
    );

    // Supprimer les anciens produits (seulement si des produits sont fournis)
    if (Array.isArray(productsSupplied)) {
      await pool.execute('DELETE FROM supplier_products WHERE supplier_id = ?', [id]);

      // Ajouter les nouveaux produits fournis
      if (productsSupplied.length > 0) {
        for (const product of productsSupplied) {
          if (product.trim()) {
            try {
              await pool.execute(
                'INSERT INTO supplier_products (id, supplier_id, product_name) VALUES (?, ?, ?)',
                [uuidv4(), id, product.trim()]
              );
            } catch (err) {
              // Ignorer les doublons
              if (err.code !== 'ER_DUP_ENTRY') {
                throw err;
              }
            }
          }
        }
      }
    }

    // Récupérer le fournisseur mis à jour
    const [updatedSupplier] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ?',
      [id]
    );

    // Récupérer les produits fournis
    const [products] = await pool.execute(
      'SELECT product_name FROM supplier_products WHERE supplier_id = ?',
      [id]
    );

    // Transformer pour correspondre au format frontend
    const supplier = updatedSupplier[0];
    const transformedSupplier = {
      ...supplier,
      contactPerson: supplier.contact_person,
      totalOrders: 0,
      lastOrderDate: new Date().toISOString(),
      productsSupplied: products.map(p => p.product_name),
      rating: supplier.rating || 5.0
    };

    console.log('✅ Fournisseur mis à jour:', transformedSupplier);

    res.json({
      success: true,
      message: 'Fournisseur mis à jour avec succès',
      data: transformedSupplier
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour fournisseur:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du fournisseur: ' + error.message
    });
  }
});

// Supprimer un fournisseur (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE suppliers SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['inactive', id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Fournisseur supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression fournisseur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du fournisseur'
    });
  }
});

module.exports = router;