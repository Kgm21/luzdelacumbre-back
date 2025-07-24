// src/routes/availability.js
const { Router } = require('express');
const { check } = require('express-validator');
const {
  initAvailability,
  setAvailability,
  getAvailability,
  getAvailabilityById,
  findAvailableRooms,
  updateAvailability,
  deleteAvailability,syncAvailabilityWithBookings
} = require('../controllers/availabilityController');

const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidRoom } = require('../helpers/dbValidators');

const router = Router();

// Inicializa disponibilidad (admin)
router.post(
  '/init',
  [ validateJWT, isAdminRole, validateFields ],
  initAvailability
);

// Listar todas (admin)
router.get(
  '/',
  [ validateJWT, isAdminRole, validateFields ],
  getAvailability
);

// Obtener por ID (admin)
router.get(
  '/:id',
  [ validateJWT, isAdminRole, check('id','ID inválido').isMongoId(), validateFields ],
  getAvailabilityById
);

// Crear un día de disponibilidad (admin)
router.post(
  '/',
  [
    validateJWT,
    isAdminRole,
    check('roomId','ID de habitación obligatorio').isMongoId(),
    check('roomId').custom(isValidRoom),
    check('date','Fecha obligatoria').isISO8601(),
    check('isAvailable','isAvailable debe ser booleano').isBoolean(),
    validateFields
  ],
  setAvailability
);

// Actualizar disponibilidad por ID (admin)
router.put(
  '/:id',
  [
    validateJWT,
    isAdminRole,
    check('id','ID inválido').isMongoId(),
    check('roomId').optional().isMongoId(),
    check('roomId').optional().custom(isValidRoom),
    check('date','Fecha inválida').optional().isISO8601(),
    check('isAvailable','isAvailable debe ser booleano').optional().isBoolean(),
    validateFields
  ],
  updateAvailability
);
// Sincronizar disponibilidad con reservas reales
router.post(
  '/sync',
  [validateJWT, isAdminRole, validateFields],
  syncAvailabilityWithBookings
);

// Eliminar disponibilidad por ID (admin)
router.delete(
  '/:id',
  [ validateJWT, isAdminRole, check('id','ID inválido').isMongoId(), validateFields ],
  deleteAvailability
);

// Buscar habitaciones disponibles entre dos fechas y por cantidad de pasajeros
router.get(
  '/search/rooms',
  [
    // No protegida o con JWT segun tu lógica
    check('checkInDate','checkInDate obligatorio').isISO8601(),
    check('checkOutDate','checkOutDate obligatorio').isISO8601(),
    check('guests','guests obligatorio y entero').isInt({ min: 1 }),
    validateFields
  ],
  findAvailableRooms
);

module.exports = router;

