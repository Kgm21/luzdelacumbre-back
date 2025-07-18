const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { generateJWT } = require('../helpers/generateJWT');

const VALID_ROLES = ['admin', 'client'];

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Cuenta desactivada' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
    }

    const token = await generateJWT(user._id, user.role);

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { name, apellido, email, password, role } = req.body;

    const existeCorreo = await User.findOne({ email });
    if (existeCorreo) {
      return res.status(400).json({ message: 'Ya existe un usuario con este correo' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    let rolAsignado = 'client';
    if (req.user?.role === 'admin' && role && VALID_ROLES.includes(role)) {
      rolAsignado = role;
    }

    const usuario = new User({ name, apellido, email, password: hash, role: rolAsignado });
    await usuario.save();

    res.status(201).json({ message: 'Usuario registrado correctamente', usuario });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// ✅ PERFIL (única vez)
const perfil = async (req, res) => {
  try {
    const user = await User.findById(req.uid).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
  }
};

module.exports = { login, register, perfil };
