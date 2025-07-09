const mongoose = require('mongoose');
const Room = require('../models/Room');
const Booking = require('../models/Booking')
const Availability = require('../models/Availability')

const createRoom = async (req, res) => {
  try {
    const { roomNumber, type, price, description, capacity, isAvailable } = req.body;

    // Obtener URLs de las imágenes subidas
    let imageUrls = [];
    if (req.files) {
      imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    const newRoom = new Habitacion({
      roomNumber,
      type,
      price,
      description,
      capacity,
      isAvailable,
      imageUrls,
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getRooms = async (req, res) => {
  try {
    const { checkInDate, checkOutDate } = req.query;

    let rooms = await Room.find();

    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);

      if (isNaN(start) || isNaN(end) || end <= start) {
        return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
      }

      // Crear array de fechas en el rango
      const dates = [];
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d.getTime()));
      }

      // Obtener disponibilidad para las fechas solicitadas
      const availabilities = await Availability.find({
        date: { $in: dates },
      });

      // Filtrar habitaciones disponibles
      rooms = await Promise.all(
        rooms.map(async (room) => {
          const roomAvailabilities = availabilities.filter(
            (avail) => avail.roomId.toString() === room._id.toString()
          );
          const isAvailable = roomAvailabilities.length === dates.length && roomAvailabilities.every((avail) => avail.isAvailable);

          return {
            ...room.toObject(),
            id: room._id.toString(),
            isAvailable,
          };
        })
      );

      // Filtrar solo habitaciones disponibles si se proporcionaron fechas
      rooms = rooms.filter((room) => room.isAvailable);
    } else {
      // Devolver todas las habitaciones sin filtrar por disponibilidad
      rooms = rooms.map((room) => ({
        ...room.toObject(),
        id: room._id.toString(),
      }));
    }

    res.json({
      data: rooms,
      total: rooms.length,
    });
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
    const updateData = { ...req.body };

    if (req.files && req.files.length > 0) {
      updateData.imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    const updatedRoom = await Habitacion.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedRoom) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteRoom = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'ID inválido' });
    }

    const room = await Room.findById(id).session(session);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    // Verificar si hay reservas activas
    const activeBookings = await Booking.find({
      roomId: id,
      checkOutDate: { $gte: new Date() },
      status: { $in: ['confirmed', 'pending'] },
    }).session(session);

    if (activeBookings.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: 'No se puede deshabilitar la habitación porque tiene reservas activas',
      });
    }

    // Liberar todas las fechas asociadas en Availability
    await Availability.updateMany(
      { roomId: id },
      { $set: { isAvailable: true } },
      { session }
    );

    // Marcar la habitación como no disponible
    room.isAvailable = !room.isAvailable;
    await room.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Habitación deshabilitada', room });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al deshabilitar la habitación:', error);
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
