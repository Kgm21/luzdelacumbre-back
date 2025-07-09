const { Router } = require('express');
const { check } = require('express-validator');
const upload = require('../middlewares/upload');
const {
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  getRoomById,
} = require('../controllers/roomController.js');
const { validateFields } = require('../middlewares/validateFields.js');
const { validateJWT } = require('../middlewares/validateJWT.js');
const { isAdminRole } = require('../middlewares/validateRoles.js');
const { isValidRoom, isValidRoomNumber } = require('../helpers/dbValidators.js');

const router = Router();

// GET: Obtener todas las habitaciones (público)
router.get('/', getRooms);

// GET: Obtener una habitación por ID (requiere token válido)
router.get(
  '/:id',
  [
    validateJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(isValidRoom),
    validateFields,
  ],
  getRoomById
);

router.post(
  '/',
  [
    validateJWT,
    isAdminRole,
    upload.array('photos', 5),  // máximo 5 imágenes
    check('roomNumber', 'El número de habitación es obligatorio').notEmpty(),
    check('roomNumber').custom(isValidRoomNumber),
    check('price', 'El precio debe ser un número positivo').isFloat({ min: 0 }),
    validateFields,
  ],
  createRoom
);

router.put(
  '/:id',
  [
    validateJWT,
    isAdminRole,
    upload.array('photos', 5),  // también acá
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(isValidRoom),
    check('roomNumber').optional().custom(isValidRoomNumber),
    check('type', 'Tipo de habitación no válido')
      .optional()
      .isIn(['individual', 'doble', 'suite', 'familiar', 'deluxe', 'cabana']),
    check('price', 'El precio debe ser un número positivo').optional().isFloat({ min: 0 }),
    validateFields,
  ],
  updateRoom
);

// DELETE: Eliminar una habitación (solo admin)
router.delete(
  '/:id',
  [
    validateJWT,
    isAdminRole,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(isValidRoom),
    validateFields,
  ],
  deleteRoom
);

module.exports = router;
