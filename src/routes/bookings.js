const { Router } = require('express');
const { check } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  deleteMyBooking
} = require('../controllers/bookingController');
const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidRoom, isValidBooking } = require('../helpers/dbValidators');



const Reserva = require('../models/Booking');
const { getMyBookings } = require('../controllers/bookingController');

const router = Router();

router.get('/mias', validateJWT, getMyBookings);

// Resto de rutas (sin cambios)
router.get('/', [
  validateJWT,
  isAdminRole,
  validateFields,
], getBookings);

router.get('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], getBookingById);

router.post('/', [
  validateJWT,
  check('roomId', 'El ID de la habitación es obligatorio').isMongoId(),
  check('roomId').custom(isValidRoom),
  check('checkInDate', 'La fecha de entrada es obligatoria').notEmpty().isISO8601(),
  check('checkOutDate', 'La fecha de salida es obligatoria').notEmpty().isISO8601(),
  check('passengersCount', 'La cantidad de pasajeros es obligatoria').isInt({ min: 1 }),
  validateFields,
], createBooking);

router.put('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('roomId', 'No es un ID de habitación válido').optional().isMongoId(),
  check('roomId').optional().custom(isValidRoom),
  check('passengersCount', 'La cantidad de pasajeros debe ser un número').optional().isInt({ min: 1 }),
  check('checkInDate', 'La fecha de check-in es obligatoria').optional().isDate(),
  check('checkOutDate', 'La fecha de check-out es obligatoria').optional().isDate(),
  validateFields,
], updateBooking);
router.delete('/mias/:id', [
  validateJWT,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], deleteMyBooking);

router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidBooking),
  validateFields,
], deleteBooking);





module.exports = router;
