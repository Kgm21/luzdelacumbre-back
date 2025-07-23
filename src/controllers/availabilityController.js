// src/controllers/availabilityController.js
const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

const initAvailability = async (req, res) => {
  try {
    const rooms = await Room.find();

    // Rango de hoy hasta +5 meses
    const startDate = new Date();
    startDate.setUTCHours(0,0,0,0);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth()+5);
    endDate.setUTCHours(0,0,0,0);

    // Strings para la respuesta
    const startStr = startDate.toISOString().slice(0,10);
    const endStr   = endDate  .toISOString().slice(0,10);

    // 1. Reservas que intersectan el rango
    const bookings = await Booking.find({
      checkInDate:  { $lte: endDate },
      checkOutDate: { $gte: startDate },
    });

    // 2. Mapa de días reservados
    const reservedMap = new Map();
    bookings.forEach(({ roomId, checkInDate, checkOutDate }) => {
      let cur = new Date(checkInDate);
      cur.setUTCHours(0,0,0,0);
      const end = new Date(checkOutDate);
      end.setUTCHours(0,0,0,0);
      while (cur <= end) {
        reservedMap.set(`${roomId}-${cur.toISOString().slice(0,10)}`, true);
        cur.setDate(cur.getDate()+1);
      }
    });

    // 3. Mapa de bloqueos previos (isAvailable: false)
    const existing = await Availability.find({
      date: { $gte: startDate, $lte: endDate },
      isAvailable: false
    });
    const blockedMap = new Map();
    existing.forEach(({ roomId, date }) => {
      const d = new Date(date);
      d.setUTCHours(0,0,0,0);
      blockedMap.set(`${roomId}-${d.toISOString().slice(0,10)}`, true);
    });

    // 4. Bulk ops
    const ops = [];
    rooms.forEach(room => {
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const dUTC = new Date(Date.UTC(cur.getUTCFullYear(),cur.getUTCMonth(),cur.getUTCDate()));
        const key = `${room._id}-${dUTC.toISOString().slice(0,10)}`;
        const available = !reservedMap.has(key) && !blockedMap.has(key);
        ops.push({
          updateOne: {
            filter: { roomId: room._id, date: dUTC },
            update: { $set: { isAvailable: available }, $currentDate: { updatedAt: true }},
            upsert: true
          }
        });
        cur.setUTCDate(cur.getUTCDate()+1);
      }
    });

    if (!ops.length) return res.json({ message: 'Nada para actualizar' });

    const result = await Availability.bulkWrite(ops, { ordered:false });
    return res.json({
      message: `Disponibilidad inicializada desde ${startStr} hasta ${endStr}`,
      result
    });

  } catch (err) {
    console.error('initAvailability error:', err);
    return res.status(500).json({ message:'Error al inicializar', error: err.message });
  }
};

const setAvailability = async (req, res) => {
  const { roomId, date, isAvailable } = req.body;
  // validaciones omitidas por brevedad...
  const d = new Date(date);
  const day = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const doc = await Availability.findOneAndUpdate(
    { roomId, date: day },
    { isAvailable, date: day },
    { upsert:true, new:true }
  );
  return res.json({ message:'Actualizado', availability:doc });
};

const getAvailability = async (req, res) => {
  // Lista paginada / filtros simples...
  const results = await Availability.find().limit(100);
  return res.json(results);
};

const getAvailabilityById = async (req, res) => {
  const { id } = req.params;
  const doc = await Availability.findById(id);
  if (!doc) return res.status(404).json({ message:'No existe' });
  return res.json(doc);
};

const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const doc = await Availability.findByIdAndUpdate(id, fields, { new:true });
  if (!doc) return res.status(404).json({ message:'No existe' });
  return res.json({ message:'Actualizado', availability:doc });
};

const deleteAvailability = async (req, res) => {
  const { id } = req.params;
  const doc = await Availability.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ message:'No existe' });
  return res.json({ message:'Eliminado' });
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

    // 🔎 1. Obtener solo habitaciones habilitadas (disponibles)
    const allRooms = await Room.find({ isAvailable: true });
    if (allRooms.length === 0) {
      return res.json([]);
    }

    // 🔍 2. Generar el rango de fechas para consultar disponibilidad
    const datesInRange = [];
    let current = new Date(start);
    while (current < end) {
      datesInRange.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // 📆 3. Buscar fechas marcadas como no disponibles
    const unavailableAvailabilityRecords = await Availability.find({
      date: { $in: datesInRange },
      isAvailable: false
    });

    // 📘 4. Buscar reservas que interfieran con el rango
    const bookedRoomsInDateRange = await Booking.find({
      $or: [
        { checkInDate: { $lt: end, $gte: start } },
        { checkOutDate: { $gt: start, $lte: end } },
        { checkInDate: { $lte: start }, checkOutDate: { $gte: end } }
      ]
    });

    const unavailableRoomIds = new Set();

    // ➕ Agregar habitaciones no disponibles por disponibilidad explícita
    unavailableAvailabilityRecords.forEach(record => {
      unavailableRoomIds.add(record.roomId.toString());
    });

    // ➕ Agregar habitaciones con reservas conflictivas
    bookedRoomsInDateRange.forEach(booking => {
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

    // ✅ 5. Filtrar habitaciones que están disponibles y tienen capacidad suficiente
    const availableRooms = allRooms.filter(room => {
      if (unavailableRoomIds.has(room._id.toString())) {
        return false;
      }
      return room.capacity >= numGuests;
    });

    // 📤 6. Devolver la lista final
    return res.json(availableRooms);

  } catch (err) {
    console.error('findAvailableRooms error:', err);
    return res.status(500).json({ message: 'Error al buscar habitaciones disponibles', error: err.message });
  }
};

module.exports = {
  initAvailability,
  setAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  findAvailableRooms
};
