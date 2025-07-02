const mongoose = require('mongoose');
const Room = require('../models/Room');

const createRoom = async (req, res) => {
  try {
    const { roomNumber, price, description, imageUrls, capacity } = req.body;

    if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim() === '') {
      return res.status(400).json({ message: 'Número de habitación inválido o faltante' });
    }

    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Precio debe ser un número positivo' });
    }

    if (imageUrls !== undefined) {
      if (!Array.isArray(imageUrls) || !imageUrls.every(url => typeof url === 'string')) {
        return res.status(400).json({ message: 'imageUrls debe ser un arreglo de strings' });
      }
    }

    if (typeof capacity !== 'number' || isNaN(capacity) || capacity < 1) {
      return res.status(400).json({ message: 'La capacidad debe ser un número mayor o igual a 1' });
    }

    const newRoom = new Room({
      roomNumber: roomNumber.trim(),
      price,
      description: typeof description === 'string' ? description.trim() : '',
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      capacity,
      // no pasamos "type", lo pone mongoose solo como 'cabaña'
    });

    await newRoom.save();

    res.status(201).json({
      message: 'Habitación creada',
      room: newRoom,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El número de habitación ya existe' });
    }
    res.status(500).json({ message: 'Error al crear la habitación', error: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las habitaciones', error: error.message });
  }
};

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la habitación', error: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNumber, type, price, description, imageUrls, capacity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const fieldsToUpdate = {};

    if (roomNumber !== undefined) {
      if (typeof roomNumber !== 'string' || roomNumber.trim() === '') {
        return res.status(400).json({ message: 'Número de habitación inválido' });
      }
      fieldsToUpdate.roomNumber = roomNumber.trim();
    }

    if (type !== undefined) {
      const validTypes = ['cabaña'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'Tipo de habitación no válido' });
      }
      fieldsToUpdate.type = type;
    }

    if (price !== undefined) {
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        return res.status(400).json({ message: 'Precio debe ser un número positivo' });
      }
      fieldsToUpdate.price = price;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ message: 'Descripción debe ser texto' });
      }
      fieldsToUpdate.description = description.trim();
    }

    if (imageUrls !== undefined) {
      if (!Array.isArray(imageUrls) || !imageUrls.every(url => typeof url === 'string')) {
        return res.status(400).json({ message: 'imageUrls debe ser un arreglo de strings' });
      }
      fieldsToUpdate.imageUrls = imageUrls;
    }

    if (capacity !== undefined) {
      if (typeof capacity !== 'number' || isNaN(capacity) || capacity < 1) {
        return res.status(400).json({ message: 'Capacidad inválida' });
      }
      fieldsToUpdate.capacity = capacity;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar' });
    }

    const updatedRoom = await Room.findByIdAndUpdate(id, fieldsToUpdate, { new: true });

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json({
      message: 'Habitación actualizada',
      room: updatedRoom,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El número de habitación ya existe' });
    }
    res.status(500).json({ message: 'Error al actualizar la habitación', error: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const room = await Room.findByIdAndUpdate(id, { isAvailable: false }, { new: true });
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json({ message: 'Habitación deshabilitada', room });
  } catch (error) {
    res.status(500).json({ message: 'Error al deshabilitar la habitación', error: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
};
