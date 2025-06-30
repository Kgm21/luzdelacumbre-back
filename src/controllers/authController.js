const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { generateJWT } = require('../helpers/generateJWT');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    // Validación combinada según el entorno
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!user) {
      return res.status(isDevelopment ? 404 : 400).json({
        message: isDevelopment ? 'Usuario no encontrado' : 'Correo o contraseña incorrectos',
      });
    }

    if (!user.isActive) {
      return res.status(isDevelopment ? 403 : 400).json({
        message: isDevelopment ? 'Cuenta desactivada. Contacta al administrador.' : 'Correo o contraseña incorrectos',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(isDevelopment ? 401 : 400).json({
        message: isDevelopment ? 'Contraseña incorrecta' : 'Correo o contraseña incorrectos',
      });
    }

    const token = await generateJWT(user.id);
    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message,
    });
  }
};

const register = async (req = request, res = response) => {
  try {
    const { name, apellido, email, password, role } = req.body;

    console.log('Datos recibidos en register:', req.body);

    // Validación previa
    const existeCorreo = await User.findOne({ email });
    if (existeCorreo) {
      return res.status(400).json({
        message: 'Ya existe un usuario con este correo',
        field: 'email',
        type: 'duplicate'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    let rolAsignado = 'client';

    if (req.user?.role === 'admin' && role) {
      if (!['admin', 'client'].includes(role)) {
        return res.status(400).json({ message: 'Rol inválido' });
      }
      rolAsignado = role;
    }

    const usuario = new User({ name, apellido, email, password: hash, role: rolAsignado });
    console.log('Usuario a guardar en register:', usuario);

    await usuario.save();

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      usuario
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error.stack);

    // Validación de respaldo por índice único
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        message: 'Ya existe un usuario con este correo',
        field: 'email',
        type: 'duplicate'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Error de validación',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Error interno del servidor al registrar el usuario',
      error: error.message
    });
  }
};





module.exports = { login, register };