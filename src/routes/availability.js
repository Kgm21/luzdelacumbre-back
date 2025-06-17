const { Router } = require('express');
const { check } = require('express-validator');
const {
  setAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  findAvailableRooms,
  initAvailability
} = require('../controllers/availabilityController');

const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidRoom } = require('../helpers/dbValidators');

const router = Router();

// ✅ Rutas específicas (deben ir antes que /:id)
router.post('/init', [
  validateJWT,
  isAdminRole,
  validateFields
], initAvailability);

// ✅ Rutas públicas o semipúblicas
router.get('/available-rooms', findAvailableRooms);

// ✅ Rutas protegidas para admin
router.get('/', [
  validateJWT,
  isAdminRole,
  validateFields,
], getAvailability);

router.get('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  validateFields,
], getAvailabilityById);

router.post('/', [
  validateJWT,
  isAdminRole,
  check('roomId', 'El ID de la habitación es obligatorio').isMongoId(),
  check('roomId').custom(isValidRoom),
  check('date', 'La fecha es obligatoria').isDate(),
  check('isAvailable', 'El estado de disponibilidad es obligatorio').isBoolean(),
  validateFields,
], setAvailability);

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

router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  validateFields,
], deleteAvailability);

module.exports = router;
