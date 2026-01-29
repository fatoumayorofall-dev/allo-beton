const Joi = require('joi');

// Schémas de validation
const saleSchema = Joi.object({
  customerId: Joi.string().uuid().allow(null),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().uuid().required(),
      quantity: Joi.number().positive().required(),
      price: Joi.number().positive().required()
    })
  ).min(1).required(),
  deliveryDate: Joi.date().allow(null),
  notes: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'confirmed', 'shipped', 'delivered', 'cancelled').default('draft'),
  saleNumber: Joi.string().allow(''),
  vehiclePlate: Joi.string().allow(''),
  driverName: Joi.string().allow(''),
  productType: Joi.string().allow(''),
  loadingLocation: Joi.string().allow(''),
  destination: Joi.string().allow(''),
  dischargeTime: Joi.date().allow(null),
  weightLoaded: Joi.number().min(0).allow(null)
});

const updateSaleSchema = Joi.object({
  status: Joi.string().valid('draft', 'confirmed', 'shipped', 'delivered', 'cancelled'),
  due_date: Joi.date(),
  payment_status: Joi.string().valid('pending', 'partial', 'paid', 'overdue'),
  payment_method: Joi.string(),
  notes: Joi.string().allow(''),
  vehicle_plate: Joi.string().allow(''),
  driver_name: Joi.string().allow(''),
  product_type: Joi.string().allow(''),
  loading_location: Joi.string().allow(''),
  destination: Joi.string().allow(''),
  discharge_time: Joi.date().allow(null),
  weight_loaded: Joi.number().min(0),
  sale_number: Joi.string()
}).min(1);

const importSchema = Joi.object({
  rows: Joi.array().items(Joi.object()).min(1).required(),
  mapping: Joi.object({
    saleNumberHeader: Joi.string().allow(''),
    dateHeader: Joi.string().allow(''),
    timeHeader: Joi.string().allow(''),
    customerId: Joi.string().uuid().allow(''),
    vehiclePlateHeader: Joi.string().allow(''),
    driverNameHeader: Joi.string().allow(''),
    productTypeHeader: Joi.string().allow(''),
    loadingLocationHeader: Joi.string().allow(''),
    destinationHeader: Joi.string().allow(''),
    weightHeader: Joi.string().allow('')
  })
});

// Middleware de validation
const validateSale = (req, res, next) => {
  const { error, value } = saleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedData = value;
  next();
};

const validateUpdateSale = (req, res, next) => {
  const { error, value } = updateSaleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedData = value;
  next();
};

const validateImport = (req, res, next) => {
  const { error, value } = importSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Données d\'import invalides',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
    });
  }
  req.validatedData = value;
  next();
};

module.exports = {
  validateSale,
  validateUpdateSale,
  validateImport,
  saleSchema,
  updateSaleSchema,
  importSchema
};
