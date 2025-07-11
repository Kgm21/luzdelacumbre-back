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
  check('roomId', 'El ID de la habitación es obligatorio').isMongoId(),
  check('roomId').custom(isValidRoom),
  check('checkInDate', 'La fecha de entrada es obligatoria').notEmpty().isISO8601(),
  check('checkOutDate', 'La fecha de salida es obligatoria').notEmpty().isISO8601(),
  check('passengersCount', 'La cantidad de pasajeros es obligatoria').isInt({ min: 1 }),
  validateFields,
], createBooking);

// PUT: Actualizar una reserva (solo administradores)
router.put(
  '/:id',
  [
    validateJWT,
    isAdminRole,
    check('id', 'No es un ID válido').isMongoId(),
    check('roomId', 'No es un ID de habitación válido').optional().isMongoId(),
    check('roomId').optional().custom(isValidRoom),
    check('passengersCount', 'La cantidad de pasajeros debe ser un número').optional().isInt({ min: 1 }),
    check('checkInDate', 'La fecha de check-in es obligatoria').optional().isDate(),
    check('checkOutDate', 'La fecha de check-out es obligatoria').optional().isDate(),
    validateFields,
  ],
  updateBooking
);


// DELETE: Eliminar una reserva (solo administradores)
router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], deleteBooking);

module.exports = router;