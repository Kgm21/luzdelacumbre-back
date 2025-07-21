const mongoose = require('mongoose');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Availability = require('../models/Availability');

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
    const { checkInDate, checkOutDate } = req.query;

    let rooms = await Room.find().lean();

    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
      }

      const isSameDay = (d1, d2) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }

      const availabilities = await Availability.find({
        date: { $in: dates },
      }).lean();

      rooms = await Promise.all(
        rooms.map(async (room) => {
          const roomAvailabilities = availabilities.filter(
            (avail) => avail.roomId.toString() === room._id.toString()
          );
          const isAvailable = dates.every((date) =>
            roomAvailabilities.some(
              (avail) => isSameDay(avail.date, date) && avail.isAvailable
            )
          );

          return {
            ...room,
            id: room._id.toString(),
            isAvailable,
          };
        })
      );

      rooms = rooms.filter((room) => room.isAvailable);
    } else {
      rooms = rooms.map((room) => ({
        ...room,
        id: room._id.toString(),
      }));
    }

    res.json({ rooms, total: rooms.length });
  } catch (error) {
    console.error('Error al obtener habitaciones:', error);
    res.status(500).json({ message: 'Error al obtener las habitaciones', error: error.message });
  }
};

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const room = await Room.findById(id).lean();
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json({ ...room, id: room._id.toString() });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la habitación', error: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (type !== undefined) {
      return res.status(400).json({ message: 'El tipo de habitación no puede modificarse' });
    }

    const roomNumber = req.body.roomNumber;
    const price = req.body.price !== undefined ? parseFloat(req.body.price) : undefined;
    const description = req.body.description;
    const capacity = req.body.capacity !== undefined ? parseInt(req.body.capacity, 10) : undefined;
    const isAvailable =
      req.body.isAvailable !== undefined
        ? req.body.isAvailable === 'true' || req.body.isAvailable === true
        : undefined;
    const imageUrls = req.body.imageUrls;

    const fieldsToUpdate = {};

    if (roomNumber !== undefined) {
      if (typeof roomNumber !== 'string' || roomNumber.trim() === '') {
        return res.status(400).json({ message: 'Número de habitación inválido' });
      }
      fieldsToUpdate.roomNumber = roomNumber.trim();
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

    if (capacity !== undefined) {
      if (typeof capacity !== 'number' || isNaN(capacity) || capacity < 1) {
        return res.status(400).json({ message: 'Capacidad inválida' });
      }
      fieldsToUpdate.capacity = capacity;
    }

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({ message: 'isAvailable debe ser booleano' });
      }
      fieldsToUpdate.isAvailable = isAvailable;
    }

    if (imageUrls !== undefined) {
      if (!Array.isArray(imageUrls) || !imageUrls.every(url => typeof url === 'string')) {
        return res.status(400).json({ message: 'imageUrls debe ser un arreglo de strings' });
      }
      fieldsToUpdate.imageUrls = imageUrls;
    }

    const updatedRoom = await Room.findByIdAndUpdate(id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json({ message: 'Habitación actualizada', room: updatedRoom });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la habitación', error: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findByIdAndDelete(id);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json({ message: 'Habitación eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la habitación', error: error.message });
  }
};

const disableRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    room.isAvailable = !room.isAvailable;
    await room.save();

    // Marcar todas las disponibilidades asociadas
    await Availability.updateMany(
      { roomId: room._id },
      { $set: { isAvailable: room.isAvailable } }
    );

    res.json({
      message: `Habitación ${room.isAvailable ? 'habilitada' : 'deshabilitada'}`,
      room,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado de habitación', error: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  disableRoom,
};
