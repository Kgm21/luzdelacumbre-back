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
    const { checkInDate, checkOutDate, limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let rooms = await Room.find().skip(skip).limit(parseInt(limit)).lean();

    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);

      if (isNaN(start) || isNaN(end) || end <= start) {
        return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
      }

      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d.getTime()));
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
              (avail) => avail.date.getTime() === date.getTime() && avail.isAvailable
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

    res.json({
      data: rooms,
      total: rooms.length,
      page: parseInt(page),
      limit: parseInt(limit),
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

    console.log('Request body:', req.body);

    if (type !== undefined) {
      return res.status(400).json({ message: 'El tipo de habitación no puede modificarse' });
    }

    const roomNumber = req.body.roomNumber;
    const price = req.body.price ? parseFloat(req.body.price) : undefined;
    const description = req.body.description;
    const capacity = req.body.capacity ? parseInt(req.body.capacity) : undefined;
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

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar' });
    }

    if (fieldsToUpdate.roomNumber) {
      const roomWithSameNumber = await Room.findOne({ roomNumber: fieldsToUpdate.roomNumber });
      if (roomWithSameNumber && roomWithSameNumber._id.toString() !== id) {
        return res.status(400).json({ message: 'El número de habitación ya está registrado' });
      }
    }

    const updatedRoom = await Room.findByIdAndUpdate(id, fieldsToUpdate, { new: true }).lean();

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    res.json({
      message: 'Habitación actualizada',
      room: { ...updatedRoom, id: updatedRoom._id.toString() },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El número de habitación ya existe' });
    }
    res.status(500).json({ message: 'Error al actualizar la habitación', error: error.message });
  }
};

const disableRoom = async (req, res) => {
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

    await Availability.updateMany(
      { roomId: id, date: { $gte: new Date() } },
      { $set: { isAvailable: true } },
      { session }
    );

    room.isAvailable = !room.isAvailable;
    await room.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `Habitación ${room.isAvailable ? 'habilitada' : 'deshabilitada'}`,
      room: { ...room.toObject(), id: room._id.toString() },
    });
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
  disableRoom,
};