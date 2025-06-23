const { Router } = require('express');
const { check } = require('express-validator');
const { createBooking, getBookings, getBookingById, updateBooking, deleteBooking } = require('../controllers/bookingController');
const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidUser, isValidRoom, isValidBooking } = require('../helpers/dbValidators');

const router = Router();

// GET: Obtener todas las reservas (solo administradores)
router.get('/', [
  validateJWT,
  isAdminRole,
  validateFields,
], getBookings);

// GET: Obtener una reserva por ID (solo administradores)
router.get('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], getBookingById);

// POST: Crear una nueva reserva
router.post('/', [
  validateJWT,
  check('userId', 'El ID del usuario es obligatorio').isMongoId(),
  check('userId').custom(isValidUser),
  check('roomId', 'El ID de la habitación es obligatorio').isMongoId(),
  check('roomId').custom(isValidRoom),
  check('checkInDate', 'La fecha de entrada es obligatoria').isDate(),
  check('checkOutDate', 'La fecha de salida es obligatoria').isDate(),
  validateFields,
], createBooking);

// PUT: Actualizar una reserva (solo administradores)
router.put('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  check('userId').optional().isMongoId(),
  check('userId').optional().custom(isValidUser),
  check('roomId').optional().isMongoId(),
  check('roomId').optional().custom(isValidRoom),
  check('checkInDate', 'La fecha de entrada debe ser válida').optional().isDate(),
  check('checkOutDate', 'La fecha de salida debe ser válida').optional().isDate(),
  check('totalPrice', 'El precio total debe ser un número positivo').optional().isFloat({ min: 0 }),
  check('status', 'El estado no es válido').optional().isIn(['confirmed', 'cancelled', 'pending']),
  validateFields,
], updateBooking);

// DELETE: Eliminar una reserva (solo administradores)
router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], deleteBooking);

module.exports = router;