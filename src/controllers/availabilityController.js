// src/controllers/availabilityController.js
const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

const initAvailability = async (req, res) => {
  try {
    const rooms = await Room.find();

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 5);
    endDate.setUTCHours(0, 0, 0, 0);

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const bookings = await Booking.find({
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
    });

    const reservedMap = new Map();
    bookings.forEach(({ roomId, checkInDate, checkOutDate }) => {
      let cur = new Date(checkInDate);
      cur.setUTCHours(0, 0, 0, 0);
      const end = new Date(checkOutDate);
      end.setUTCHours(0, 0, 0, 0);
      while (cur <= end) {
        reservedMap.set(`${roomId}-${cur.toISOString().slice(0, 10)}`, true);
        cur.setDate(cur.getDate() + 1);
      }
    });

    const existing = await Availability.find({
      date: { $gte: startDate, $lte: endDate },
      isAvailable: false,
    });

    const blockedMap = new Map();
    existing.forEach(({ roomId, date }) => {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      blockedMap.set(`${roomId}-${d.toISOString().slice(0, 10)}`, true);
    });

    const ops = [];
    rooms.forEach((room) => {
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const dUTC = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));
        const key = `${room._id}-${dUTC.toISOString().slice(0, 10)}`;
        const available = !reservedMap.has(key) && !blockedMap.has(key);
        ops.push({
          updateOne: {
            filter: { roomId: room._id, date: dUTC },
            update: {
              $set: { isAvailable: available },
              $currentDate: { updatedAt: true },
            },
            upsert: true,
          },
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    });

    if (!ops.length) return res.json({ message: 'Nada para actualizar' });

    const result = await Availability.bulkWrite(ops, { ordered: false });
    return res.json({
      message: `Disponibilidad inicializada desde ${startStr} hasta ${endStr}`,
      result,
    });
  } catch (err) {
    console.error('initAvailability error:', err);
    return res.status(500).json({ message: 'Error al inicializar', error: err.message });
  }
};

// 🧠 Utilidad para sincronizar disponibilidad (sin req/res)
const syncAvailabilityUtil = async () => {
  const rooms = await Room.find();

  for (const room of rooms) {
    const roomId = room._id;

    const unavailableDays = await Availability.find({
      roomId,
      isAvailable: false,
    });

    for (const unavailability of unavailableDays) {
      const date = new Date(unavailability.date);
      date.setUTCHours(0, 0, 0, 0);

      const overlappingBooking = await Booking.findOne({
        roomId,
        checkInDate: { $lte: date },
        checkOutDate: { $gt: date },
      });

      if (!overlappingBooking) {
        unavailability.isAvailable = true;
        await unavailability.save();
      }
    }
  }

  return true;
};

// 🎯 Handler Express que llama a la utilidad
const syncAvailabilityWithBookings = async (req, res) => {
  try {
    await syncAvailabilityUtil();
    return res.json({ ok: true, message: 'Disponibilidades sincronizadas correctamente' });
  } catch (error) {
    console.error('Error al sincronizar disponibilidades:', error);
    return res.status(500).json({ message: 'Error al sincronizar disponibilidades', error: error.message });
  }
};

const setAvailability = async (req, res) => {
  const { roomId, date, isAvailable } = req.body;
  const d = new Date(date);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const doc = await Availability.findOneAndUpdate(
    { roomId, date: day },
    { isAvailable, date: day },
    { upsert: true, new: true }
  );
  return res.json({ message: 'Actualizado', availability: doc });
};

const getAvailability = async (req, res) => {
  const results = await Availability.find().limit(100);
  return res.json(results);
};

const getAvailabilityById = async (req, res) => {
  const { id } = req.params;
  const doc = await Availability.findById(id);
  if (!doc) return res.status(404).json({ message: 'No existe' });
  return res.json(doc);
};

const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const doc = await Availability.findByIdAndUpdate(id, fields, { new: true });
  if (!doc) return res.status(404).json({ message: 'No existe' });
  return res.json({ message: 'Actualizado', availability: doc });
};

const deleteAvailability = async (req, res) => {
  const { id } = req.params;
  const doc = await Availability.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ message: 'No existe' });
  return res.json({ message: 'Eliminado' });
};

const findAvailableRooms = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, guests } = req.query;

    if (!checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({ message: 'Fechas de entrada, salida y número de huéspedes son requeridos.' });
    }

    const start = new Date(checkInDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(checkOutDate);
    end.setUTCHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Fechas inválidas. Asegúrate de que la fecha de salida es posterior a la de entrada.' });
    }

    const numGuests = parseInt(guests, 10);
    if (isNaN(numGuests) || numGuests < 1) {
      return res.status(400).json({ message: 'Número de huéspedes inválido.' });
    }

    const allRooms = await Room.find({ isAvailable: true });
    if (allRooms.length === 0) return res.json([]);

    const datesInRange = [];
    let current = new Date(start);
    while (current < end) {
      datesInRange.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const unavailableAvailabilityRecords = await Availability.find({
      date: { $in: datesInRange },
      isAvailable: false,
    });

    const bookedRoomsInDateRange = await Booking.find({
      $or: [
        { checkInDate: { $lt: end, $gte: start } },
        { checkOutDate: { $gt: start, $lte: end } },
        { checkInDate: { $lte: start }, checkOutDate: { $gte: end } },
      ],
    });

    const unavailableRoomIds = new Set();
    unavailableAvailabilityRecords.forEach((record) => {
      unavailableRoomIds.add(record.roomId.toString());
    });

    bookedRoomsInDateRange.forEach((booking) => {
      let bookingCur = new Date(booking.checkInDate);
      bookingCur.setUTCHours(0, 0, 0, 0);
      let bookingEnd = new Date(booking.checkOutDate);
      bookingEnd.setUTCHours(0, 0, 0, 0);

      let tempCheck = new Date(start);
      while (tempCheck < end) {
        if (tempCheck >= bookingCur && tempCheck < bookingEnd) {
          unavailableRoomIds.add(booking.roomId.toString());
          break;
        }
        tempCheck.setUTCDate(tempCheck.getUTCDate() + 1);
      }
    });

    const availableRooms = allRooms.filter((room) => {
      if (unavailableRoomIds.has(room._id.toString())) return false;
      return room.capacity >= numGuests;
    });

    return res.json(availableRooms);
  } catch (err) {
    console.error('findAvailableRooms error:', err);
    return res.status(500).json({ message: 'Error al buscar habitaciones disponibles', error: err.message });
  }
};
module.exports = {
  initAvailability,
  syncAvailabilityWithBookings,
  syncAvailabilityUtil, // ✅ agregalo acá
  setAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  findAvailableRooms
};
