const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { generateJWT } = require('../helpers/generateJWT');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(400).json({
        message: 'Correo o contraseña incorrectos',
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({
        message: 'Correo o contraseña incorrectos',
      });
    }

    const token = await generateJWT(user.id);
    res.json({
      message: 'Inicio de sesión exitoso',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
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

    // Validaciones básicas (ya manejadas por express-validator)
    console.log('Datos recibidos en register:', req.body); // Log para depurar

    // Verificar si el correo ya existe
    const existeCorreo = await User.findOne({ email });
    if (existeCorreo) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Asignar rol
    let rolAsignado = 'client'; // por defecto siempre client

    if (req.user?.role === 'admin' && role) {
      if (!['admin', 'client'].includes(role)) {
        return res.status(400).json({ mensaje: 'Rol inválido' });
      }
      rolAsignado = role;
    }

    // Crear el usuario
    const usuario = new User({ name, apellido, email, password: hash, role: rolAsignado });
    console.log('Usuario a guardar en register:', usuario); // Log antes de save

    // Guardar en la base de datos
    await usuario.save();

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      usuario
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error.stack);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        mensaje: 'Error de validación',
        error: error.message
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }
    res.status(500).json({
      mensaje: 'Error interno del servidor al registrar el usuario',
      error: error.message
    });
  }
};



module.exports = { login, register };