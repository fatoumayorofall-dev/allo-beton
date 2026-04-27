/**
 * ALLO BÉTON - ROUTES E-COMMERCE INDEX
 * Point d'entrée pour toutes les routes e-commerce
 */

const express = require('express');
const router = express.Router();

// Import des routes
const productsRoutes = require('./products');
const cartRoutes = require('./cart');
const ordersRoutes = require('./orders');
const paymentsRoutes = require('./payments');
const invoicesRoutes = require('./invoices');
const customersRoutes = require('./customers');
const reviewsRoutes = require('./reviews');
const pricingRoutes = require('./pricing');
const promotionsRoutes = require('./promotions');
const settingsRoutes = require('./settings');
const adminLogsRoutes = require('./admin-logs');
const shippingZonesRoutes = require('./shipping-zones');

// Montage des routes
router.use('/products', productsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/customers', customersRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/pricing', pricingRoutes);
router.use('/promotions', promotionsRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin-logs', adminLogsRoutes);
router.use('/shipping-zones', shippingZonesRoutes);

// Route de santé e-commerce
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'e-commerce',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
