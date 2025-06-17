const { Router } = require('express');
const { check } = require('express-validator');
const { createRoom, getRooms, updateRoom, deleteRoom, getRoomById } = require('../controllers/roomController.js');
const { validateFields } = require('../middlewares/validateFields.js');
const { validateJWT } = require('../middlewares/validateJWT.js');
const { isAdminRole } = require('../middlewares/validateRoles.js');
const { isValidRoom, isValidRoomNumber } = require('../helpers/dbValidators.js');

const router = Router();

// GET: Obtener todas las habitaciones (público)
router.get('/', getRooms);

// GET: Obtener una habitación por ID
router.get('/:id', [
  validateJWT,
   check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidRoom),
  validateFields,
], getRoomById);

// POST: Crear una nueva habitación (solo administradores)
router.post('/', [
  validateJWT,
  isAdminRole,
  check('roomNumber', 'El número de habitación es obligatorio').not().isEmpty(),
  check('roomNumber').custom(isValidRoomNumber),
  check('price', 'El precio debe ser un número positivo').isFloat({ min: 0 }),
  validateFields,
], createRoom);

// PUT: Actualizar una habitación (solo administradores)
router.put('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidRoom),
  check('roomNumber').optional().custom(isValidRoomNumber),
  check('type', 'El tipo de habitación no es válido').optional().isIn(['individual', 'doble', 'suite', 'familiar', 'deluxe']),
  check('price', 'El precio debe ser un número positivo').optional().isFloat({ min: 0 }),
  validateFields,
], updateRoom);

// DELETE: Eliminar una habitación (solo administradores)
router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidRoom),
  validateFields,
], deleteRoom);

module.exports = router;