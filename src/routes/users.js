const { Router } = require('express');
const { check, body } = require('express-validator');
const { usuarioGet, usuarioPut, usuarioDelete, usuarioGetID } = require('../controllers/userController');
const { validateFields } = require('../middlewares/validateFields');
const { validateJWT } = require('../middlewares/validateJWT');
const { isAdminRole } = require('../middlewares/validateRoles');
const { isValidUser, isValidEmail } = require('../helpers/dbValidators');
const { register } = require('../controllers/authController');
const {optionalAuth} = require('../middlewares/optionalAuth')

const router = Router();


// GET: Obtener todos los usuarios (solo administradores)
router.get('/', [
  validateJWT,
  isAdminRole
], usuarioGet);

// GET: Obtener un usuario por ID
router.get('/:id', [
  validateJWT,               // Valida que venga token válido
  isAdminRole,               // Valida que sea admin
  check('id', 'No es un ID válido').isMongoId(),
  check('id').custom(isValidUser),
  validateFields,
], usuarioGetID);



// POST: Crear un nuevo usuario (registro, manejado en authController)
router.post('/', [
  optionalAuth, // agrega req.user si hay token válido

  check('name', 'El nombre es obligatorio').not().isEmpty(),
  check('apellido', 'El apellido es obligatorio').not().isEmpty(),
  check('email', 'El correo no es válido').isEmail(),
  check('email').custom(isValidEmail),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),

  // Solo usuarios autenticados pueden asignar "admin"
  body('role').custom((value, { req }) => {
    if (value === 'admin') {
      if (!req.user) {
        throw new Error('Debes estar autenticado para asignar el rol admin');
      }
      // Si querés aún más seguridad:
      // if (req.user.role !== 'admin') {
      //   throw new Error('Solo un admin puede asignar rol admin');
      // }
    }
    return true;
  }),

  // Validar que el rol sea válido (opcional, pero si lo mandan debe ser uno permitido)
  check('role', 'Rol inválido').optional().isIn(['admin', 'client']),

  validateFields
], register);



// PUT: Actualizar un usuario
router.put('/:id', [
  validateJWT,
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