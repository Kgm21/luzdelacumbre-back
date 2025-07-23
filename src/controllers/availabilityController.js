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
    start.setUTCHours(0,0,0,0);
    const end = new Date(checkOutDate);
    end.setUTCHours(0,0,0,0);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Fechas inválidas. Asegúrate de que la fecha de salida es posterior a la de entrada.' });
    }

    const numGuests = parseInt(guests, 10);
    if (isNaN(numGuests) || numGuests < 1) {
      return res.status(400).json({ message: 'Número de huéspedes inválido.' });
    }

    // 1. Obtener todas las habitaciones
    const allRooms = await Room.find();
    if (allRooms.length === 0) {
      return res.json([]); // No hay habitaciones registradas
    }

    // 2. Encontrar las IDs de las habitaciones NO disponibles para el rango de fechas
    //    Esto incluye habitaciones con reservas o marcadas como no disponibles directamente.

    // Días a buscar dentro del rango de checkIn y checkOut (excluyendo el checkOut para la disponibilidad)
    const datesInRange = [];
    let current = new Date(start);
    while (current < end) { // Iterar hasta el día anterior al checkOutDate
      datesInRange.push(new Date(current)); // Clonar para evitar mutaciones
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Buscar disponibilidades marcadas como NO disponibles (isAvailable: false)
    const unavailableAvailabilityRecords = await Availability.find({
      date: { $in: datesInRange },
      isAvailable: false
    });

    const bookedRoomsInDateRange = await Booking.find({
      $or: [
        { checkInDate: { $lt: end, $gte: start } }, // Bookings starting within the range
        { checkOutDate: { $gt: start, $lte: end } }, // Bookings ending within the range
        { checkInDate: { $lte: start }, checkOutDate: { $gte: end } } // Bookings spanning the whole range
      ]
    });

    const unavailableRoomIds = new Set();

    // Add rooms from explicit unavailability
    unavailableAvailabilityRecords.forEach(record => {
        unavailableRoomIds.add(record.roomId.toString());
    });

    // Add rooms from existing bookings for each day in the range
    bookedRoomsInDateRange.forEach(booking => {
        let bookingCur = new Date(booking.checkInDate);
        bookingCur.setUTCHours(0,0,0,0);
        let bookingEnd = new Date(booking.checkOutDate);
        bookingEnd.setUTCHours(0,0,0,0);

        // Check each day in the requested date range against the booking's date range
        let tempCheck = new Date(start); // Start checking from the requested check-in
        while(tempCheck < end) { // Up to (but not including) the requested check-out
            if (tempCheck >= bookingCur && tempCheck < bookingEnd) {
                // If any day in the requested range is within this booking's range,
                // then this room is unavailable for the requested period.
                unavailableRoomIds.add(booking.roomId.toString());
                break; // No need to check other days for this booking
            }
            tempCheck.setUTCDate(tempCheck.getUTCDate() + 1);
        }
    });


    // Filtrar las habitaciones que NO están disponibles
    const availableRooms = allRooms.filter(room => {
      // Excluir habitaciones que están explícitamente no disponibles en alguna fecha del rango
      if (unavailableRoomIds.has(room._id.toString())) {
        return false;
      }
      // Asegurarse de que la capacidad de la habitación es suficiente
      return room.capacity >= numGuests;
    });

    // 3. Devolver las habitaciones disponibles
    // IMPORTANT: Return an array, not an object with a 'msg' property.
    return res.json(availableRooms); // <-- This is the crucial change!

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
