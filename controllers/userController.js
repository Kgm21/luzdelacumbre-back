const { response, request } = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/user');

const usuarioGet = async (req = request, res = response) => {
  let {desde=0, limite=5} = req.query;
  
  desde =Number(desde)
  limite = Number(limite)
  if (isNaN(desde) || desde < 0) desde = 0;
  if (isNaN(limite) || limite < 1) limite = 5;
  const query = {estado:true};
  const [ total, usuarios ] = await Promise.all([
    Usuario.countDocuments(query), 
    Usuario.find(query).skip(desde).limit(limite)
  ]);

  res.json({
    mensaje: "Usuarios obtenidos",
    total, 
    usuarios
  });
}

const usuarioGetID = async (req = request, res = response) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findById(id);

    if (!usuario || !usuario.estado) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    res.json({
      mensaje: "Usuario obtenido",
      usuario
    });
  } catch (error) {
    res.status(400).json({
      mensaje: "Id inválido",
      error: error.message
    });
  }
}



const usuarioPost = async (req = request, res = response) => {
  const datos = req.body;
  const { nombre, apellido, correo, password, rol } = datos;

  const existeCorreo = await Usuario.findOne({ correo });
  if (existeCorreo) {
    return res.status(400).json({ mensaje: 'El correo ya está registrado' });
  }

  // Encriptar la contraseña
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const usuario = new Usuario({ nombre, apellido, correo, password: hash, rol });

  // Guardar los datos en la BD
  await usuario.save();

  res.json({
    mensaje: "Usuario cargado correctamente",
    usuario
  });
};


const usuarioPut = async (req = request, res = response) => {
  const { id } = req.params;
  const { password, correo, ...resto } = req.body;

  try {
    const usuarioExistente = await Usuario.findById(id);
    if (!usuarioExistente || !usuarioExistente.estado) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Validar y actualizar correo si fue enviado
    if (correo && correo !== usuarioExistente.correo) {
      const correoRepetido = await Usuario.findOne({ correo });
      if (correoRepetido) {
        return res.status(400).json({ mensaje: "Ese correo ya está registrado por otro usuario" });
      }
      resto.correo = correo;
    }

    // Validar y encriptar contraseña si fue enviada
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      resto.password = bcrypt.hashSync(password, salt);
    }

    const usuario = await Usuario.findByIdAndUpdate(id, resto, { new: true });

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario
    });

  } catch (error) {
    res.status(400).json({
      mensaje: "Error al actualizar el usuario",
      error: error.message
    });
  }
};


const usuarioDelete = async (req = request, res = response) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findById(id);

  
    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

  
    if (!usuario.estado) {
      return res.status(400).json({
        mensaje: "El usuario ya está inhabilitado"
      });
    }

 
    const usuarioInhabilitado = await Usuario.findByIdAndUpdate(id, { estado: false }, { new: true });

    res.json({
      mensaje: "Usuario inhabilitado correctamente",
      usuario: usuarioInhabilitado
    });

  } catch (error) {
    res.status(500).json({
      mensaje: "Error al inhabilitar el usuario",
      error: error.message
    });
  }
};


module.exports = {
  usuarioGet,
  usuarioGetID,
  usuarioPost,
  usuarioPut,
  usuarioDelete
}