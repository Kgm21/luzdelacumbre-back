const Room = require('../models/Room');

const createRoom = async (req, res) => {
  try {
    const { roomNumber, type, price, description, imageUrl } = req.body;
    const newRoom = new Room({ roomNumber, type, price, description, imageUrl });
    await newRoom.save();
    res.status(201).json({
      message: 'Habitación creada',
      room: newRoom,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de habitación ya existe',
      });
    }
    res.status(500).json({
      message: 'Error al crear la habitación',
      error: error.message,
    });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener las habitaciones',
      error: error.message,
    });
  }
};

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({
        message: 'Habitación no encontrada',
      });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener la habitación',
      error: error.message,
    });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRoom = await Room.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedRoom) {
      return res.status(404).json({
        message: 'Habitación no encontrada',
      });
    }
    res.json({
      message: 'Habitación actualizada',
      room: updatedRoom,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El número de habitación ya existe',
      });
    }
    res.status(500).json({
      message: 'Error al actualizar la habitación',
      error: error.message,
    });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRoom = await Room.findByIdAndDelete(id);
    if (!deletedRoom) {
      return res.status(404).json({
        message: 'Habitación no encontrada',
      });
    }
    res.json({
      message: 'Habitación eliminada',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar la habitación',
      error: error.message,
    });
  }
};

module.exports = { createRoom, getRooms, getRoomById, updateRoom, deleteRoom };