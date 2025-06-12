const { Router } = require('express');
const { check } = require('express-validator');
const { setAvailability, getAvailability, getAvailabilityById, updateAvailability, deleteAvailability } = require('../controllers/availabilityController');
const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidRoom } = require('../helpers/dbValidators');

const router = Router();

// GET: Obtener todas las disponibilidades (solo administradores)
router.get('/', [
  validateJWT,
  isAdminRole,
  validateFields,
], getAvailability);

// GET: Obtener una disponibilidad por ID (solo administradores)
router.get('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  validateFields,
], getAvailabilityById);

// POST: Crear o actualizar una disponibilidad (solo administradores)
router.post('/', [
  validateJWT,
  isAdminRole,
  check('roomId', 'El ID de la habitación es obligatorio').isMongoId(),
  check('roomId').custom(isValidRoom),
  check('date', 'La fecha es obligatoria').isDate(),
  check('isAvailable', 'El estado de disponibilidad es obligatorio').isBoolean(),
  validateFields,
], setAvailability);

// PUT: Actualizar una disponibilidad (solo administradores)
router.put('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('roomId').optional().isMongoId(),
  check('roomId').optional().custom(isValidRoom),
  check('date', 'La fecha debe ser válida').optional().isDate(),
  check('isAvailable', 'El estado de disponibilidad debe ser booleano').optional().isBoolean(),
  validateFields,
], updateAvailability);

// DELETE: Eliminar una disponibilidad (solo administradores)
router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  validateFields,
], deleteAvailability);

module.exports = router;