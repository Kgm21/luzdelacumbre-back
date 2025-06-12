const { Router } = require('express');
const { check } = require('express-validator');
const { usuarioGet, usuarioPut, usuarioDelete } = require('../controllers/userController');
const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidUser, isValidEmail } = require('../helpers/dbValidators');
const { register } = require('../controllers/authController');


const router = Router();

// GET: Obtener todos los usuarios (solo administradores)
router.get('/', [
  validateJWT,
  isAdminRole,
  validateFields,
], usuarioGet);

// GET: Obtener un usuario por ID
router.get('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidUser),
  validateFields,
], usuarioGet);

// POST: Crear un nuevo usuario (registro, manejado en authController)
router.post('/', [
  check('name', 'El nombre es obligatorio').not().isEmpty(),
  check('apellido', 'El apellido es obligatorio').not().isEmpty(),
  check('email', 'El correo no es válido').isEmail(),
  check('email').custom(isValidEmail),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  check('role', 'El rol no es válido').optional().isIn(['admin', 'client']),
  validateFields,
], register);

// PUT: Actualizar un usuario
router.put('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidUser),
  check('email', 'El correo no es válido').optional().isEmail(),
  check('email').optional().custom(isValidEmail),
  check('role', 'El rol no es válido').optional().isIn(['admin', 'client']),
  validateFields,
], usuarioPut);

// DELETE: Desactivar un usuario
router.delete('/:id', [
  validateJWT,
  isAdminRole,
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidUser),
  validateFields,
], usuarioDelete);

module.exports = router;