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
  const { checkInDate, checkOutDate, guests } = req.query;
  // Lógica de búsqueda en rango...
  return res.json({ msg:'Aquí van las habitaciones libres' });
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
