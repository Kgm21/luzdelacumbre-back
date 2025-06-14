const Room = require('../models/Room');

const createRoom = async (req, res) => {
    try {
    const { roomNumber, type, price, description, imageUrl } = req.body;
      // Validaciones básicas
   if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim() === '') {
  return res.status(400).json({ message: 'Número de habitación inválido o faltante' });
}
const cleanedRoomNumber = roomNumber.trim();
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
  return res.status(400).json({ message: 'Precio debe ser un número positivo' });
}


    if (!type || typeof type !== 'string' || type.trim() === '') {
      return res.status(400).json({ message: 'Tipo de habitación inválido o faltante' });
    }

    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ message: 'Precio debe ser un número positivo' });
    }

    const newRoom = new Room({ 
  roomNumber: roomNumber.trim(),
  type: type.trim(),
  price, 
  description, 
  imageUrl 
});
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
    const { roomNumber, type, price, description, imageUrl } = req.body;

    // Objeto que guardará solo los campos válidos para actualizar
    const fieldsToUpdate = {};

    if (roomNumber !== undefined) {
      if (typeof roomNumber !== 'string' || roomNumber.trim() === '') {
        return res.status(400).json({ message: 'Número de habitación inválido' });
      }
      fieldsToUpdate.roomNumber = roomNumber.trim();
    }

    if (type !== undefined) {
      if (typeof type !== 'string' || type.trim() === '') {
        return res.status(400).json({ message: 'Tipo de habitación inválido' });
      }
      fieldsToUpdate.type = type.trim();
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

    if (imageUrl !== undefined) {
      if (typeof imageUrl !== 'string') {
        return res.status(400).json({ message: 'URL de imagen debe ser texto' });
      }
      fieldsToUpdate.imageUrl = imageUrl.trim();
    }

    // Si no se envió ningún campo válido para actualizar, podemos avisar
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