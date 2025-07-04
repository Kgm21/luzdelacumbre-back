const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const Room = require('../models/Room');
const Reserva = require('../models/Booking')
 


const initAvailability = async (req, res) => {
  console.log('initAvailability: llamada recibida');
  try {
    const rooms = await Room.find();
    console.log(`Se encontraron ${rooms.length} habitaciones`);

    const startDate = new Date();
    const endDate   = new Date();
    endDate.setMonth(endDate.getMonth() + 5);
    startDate.setUTCHours(0,0,0,0);
    endDate.setUTCHours(0,0,0,0);

    // 1. Obtener reservas en el rango usando los campos correctos
    const bookings = await Reserva.find({
      checkInDate:  { $lte: endDate },
      checkOutDate: { $gte: startDate }
    });
    console.log(`Se encontraron ${bookings.length} reservas en el rango`);

    // 2. Generar reservedMap
    const reservedMap = new Map();
    for (const { roomId, checkInDate, checkOutDate } of bookings) {
      let current = new Date(checkInDate);
      current.setUTCHours(0,0,0,0);
      const end = new Date(checkOutDate);
      end.setUTCHours(0,0,0,0);

      while (current <= end) {
        const key = `${roomId}-${current.toISOString().slice(0,10)}`;
        reservedMap.set(key, true);
        current.setDate(current.getDate() + 1);
      }
    }
    console.log(`reservedMap tiene ${reservedMap.size} entradas`);

    // 3. Obtener bloqueos previos
    const existingAvail = await Availability.find({
      date:        { $gte: startDate, $lte: endDate },
      isAvailable: false
    });
    console.log(`Se encontraron ${existingAvail.length} bloqueos previos`);

    const unavailableMap = new Map();
    for (const { roomId, date } of existingAvail) {
      const d = new Date(date);
      d.setUTCHours(0,0,0,0);
      const key = `${roomId}-${d.toISOString().slice(0,10)}`;
      unavailableMap.set(key, true);
    }
    console.log(`unavailableMap tiene ${unavailableMap.size} entradas`);

    // 4. Preparar bulkOps
    const bulkOps = [];
    for (const room of rooms) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateToStore = new Date(Date.UTC(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate()
        ));
        const key = `${room._id}-${dateToStore.toISOString().slice(0,10)}`;
        const isAvailable = !(reservedMap.has(key) || unavailableMap.has(key));
        bulkOps.push({
          updateOne: {
            filter: { roomId: room._id, date: dateToStore },
            update: { $set: { isAvailable } },
            upsert: true
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log('Cantidad de operaciones bulk:', bulkOps.length);
    console.log('Primeras 3 operaciones:', bulkOps.slice(0,3));

    if (bulkOps.length === 0) {
      return res.json({ message: 'No hay disponibilidad para actualizar' });
    }

    const result = await Availability.bulkWrite(bulkOps, { ordered: false });
    console.log('bulkWrite result:', result);
    res.json({ message: 'Disponibilidad inicializada respetando reservas y bloqueos', result });

  } catch (error) {
    console.error('Error general en initAvailability:', error);
    res.status(500).json({ message: 'Error al inicializar disponibilidad', error: error.message });
  }
};



const setAvailability = async (req, res) => {
  const { roomId, date, isAvailable } = req.body;

  if (!roomId || !date || typeof isAvailable !== 'boolean') {
    return res.status(400).json({ message: 'Datos incompletos o inválidos' });
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ message: 'ID de habitación inválido' });
  }

  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ message: 'Fecha inválida' });
  }

  try {
    const inputDate = new Date(date);
    // Asegura que la fecha se actualice/upsert como inicio del día UTC
    const dateToStore = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));

    const availability = await Availability.findOneAndUpdate(
      { roomId, date: dateToStore },
      { isAvailable, date: dateToStore }, // También actualiza la fecha si hay un upsert, aunque debería ser la misma
      { upsert: true, new: true }
    );

    res.json({
      message: 'Disponibilidad actualizada',
      availability,
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({
      message: 'Error al actualizar disponibilidad',
      error: error.message,
    });
  }
};

const getAvailability = async (req, res) => {
  try {
    const { roomId, startDate, endDate, guests, page = 1, limit = 20 } = req.query;

    // Validación básica guests
    let minCapacity = null;
    if (guests) {
      const g = parseInt(guests);
      if (isNaN(g) || g <= 0) {
        return res.status(400).json({ message: 'Cantidad de pasajeros inválida.' });
      }
      minCapacity = g;
    }

    // Validar fechas
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ message: 'Debe proporcionar rango completo de fechas (startDate y endDate).' });
    }

    let datesToCheck = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Fechas inválidas.' });
      }
      if (start >= end) {
        return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la fecha de fin.' });
      }

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        datesToCheck.push(new Date(d));
      }
    }

    // Construir filtro
    const matchStage = {};
    if (roomId) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ message: 'ID de habitación inválido.' });
      }
      matchStage.roomId = new mongoose.Types.ObjectId(roomId);
    }
    if (datesToCheck.length > 0) {
      matchStage.date = { $in: datesToCheck };
    }

    // Verificar que la habitación exista si se pasó roomId
    if (roomId) {
      const exists = await Room.exists({ _id: matchStage.roomId });
      if (!exists) {
        return res.status(404).json({ message: 'La habitación con ese ID no existe.' });
      }
    }

    // Pipeline de agregación
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$roomId",
          countDatesAvailable: {
            $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] }
          },
          totalDatesInQuery: { $sum: 1 }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$countDatesAvailable", datesToCheck.length] },
              { $eq: ["$totalDatesInQuery", datesToCheck.length] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'habitacions', // revisa el nombre correcto
          localField: '_id',
          foreignField: '_id',
          as: 'habitacion'
        }
      },
      { $unwind: '$habitacion' },
      { $match: { 'habitacion.isAvailable': true } },
    ];

    if (minCapacity !== null) {
      pipeline.push({
        $match: { 'habitacion.capacity': { $gte: minCapacity } }
      });
    }

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    pipeline.push({
      $project: {
        _id: "$_id",
        roomNumber: "$habitacion.roomNumber",
        type: "$habitacion.type",
        price: "$habitacion.price",
        capacity: "$habitacion.capacity",
        imageUrls: "$habitacion.imageUrls",
        description: "$habitacion.description",
      }
    });

    const results = await Availability.aggregate(pipeline);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No se encontraron disponibilidades para los criterios proporcionados.' });
    }

    return res.json({ page: parseInt(page), limit: parseInt(limit), results });

  } catch (error) {
    console.error('Error en getAvailability:', error);
    return res.status(500).json({ message: 'Error interno en el servidor.', error: error.message });
  }
};

const getAvailabilityById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de disponibilidad inválido' });
    }

    const availability = await Availability.findById(id).populate('roomId');
    if (!availability) {
      return res.status(404).json({ message: 'Disponibilidad no encontrada' });
    }

    return res.json(availability);
  } catch (error) {
    return res.status(500).json({
      message: 'Error al obtener disponibilidad',
      error: error.message,
    });
  }
};


// ** findAvailableRooms UNIFICADO Y CORREGIDO **
const findAvailableRooms = async (req, res) => {
  try {
    const { startDate, endDate, guests, roomId } = req.query;
    const MIN_NIGHTS = 5; // Igual que en createBooking

    const queryDateRange = {};
    let datesToCheck = [];
    let minCapacity = null;

    // Validar fechas
    if (
      startDate &&
      typeof startDate === 'string' &&
      startDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
      endDate &&
      typeof endDate === 'string' &&
      endDate.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      const start = new Date(
        Date.UTC(
          parseInt(startDate.substring(0, 4)),
          parseInt(startDate.substring(5, 7)) - 1,
          parseInt(startDate.substring(8, 10)),
          0,
          0,
          0,
          0
        )
      );
      const end = new Date(
        Date.UTC(
          parseInt(endDate.substring(0, 4)),
          parseInt(endDate.substring(5, 7)) - 1,
          parseInt(endDate.substring(8, 10)),
          0,
          0,
          0,
          0
        )
      );

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Fechas inválidas' });
      }

      if (end <= start) {
        return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la fecha de fin' });
      }

      // Validar mínimo de noches
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (nights < MIN_NIGHTS) {
        return res.status(400).json({ message: `La búsqueda debe ser de al menos ${MIN_NIGHTS} noche(s)` });
      }

      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        datesToCheck.push(new Date(d));
      }

      if (datesToCheck.length === 0) {
        return res.status(400).json({ message: 'Rango de fechas inválido o sin días válidos' });
      }

      queryDateRange.$in = datesToCheck;
    } else if (startDate || endDate) {
      return res.status(400).json({ message: 'Por favor, proporcione un rango de fechas válido (YYYY-MM-DD)' });
    } else {
      return res.status(400).json({ message: 'Las fechas de inicio y fin son obligatorias para buscar habitaciones disponibles' });
    }

    // Validar guests (passengersCount)
    if (guests) {
      const parsedGuests = parseInt(guests);
      if (isNaN(parsedGuests) || parsedGuests < 1 || parsedGuests > 6) {
        return res.status(400).json({ message: 'Cantidad de pasajeros inválida, debe estar entre 1 y 6' });
      }
      minCapacity = parsedGuests;
    } else {
      return res.status(400).json({ message: 'La cantidad de pasajeros es obligatoria' });
    }

    const matchStage = {};
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      const roomObjectId = new mongoose.Types.ObjectId(roomId);
      const roomExists = await Room.exists({ _id: roomObjectId });
      if (!roomExists) {
        return res.status(404).json({ message: 'La habitación con ese ID no existe' });
      }
      matchStage.roomId = roomObjectId;
    } else if (roomId) {
      return res.status(400).json({ message: 'ID de habitación inválido' });
    }

    if (Object.keys(queryDateRange).length > 0) {
      matchStage.date = queryDateRange;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$roomId',
          countDatesAvailable: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] },
          },
          totalDatesInQuery: { $sum: 1 },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$countDatesAvailable', datesToCheck.length] },
              { $eq: ['$totalDatesInQuery', datesToCheck.length] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'habitacions',
          localField: '_id',
          foreignField: '_id',
          as: 'habitacion',
        },
      },
      { $unwind: '$habitacion' },
      { $match: { 'habitacion.isAvailable': true } },
    ];

    if (minCapacity !== null) {
      pipeline.push({
        $match: {
          'habitacion.capacity': { $gte: minCapacity },
        },
      });
    }

    pipeline.push({
      $project: {
        _id: '$_id',
        roomNumber: '$habitacion.roomNumber',
        type: '$habitacion.type',
        price: '$habitacion.price',
        capacity: '$habitacion.capacity',
        imageUrls: '$habitacion.imageUrls',
        description: '$habitacion.description',
      },
    });

    const result = await Availability.aggregate(pipeline);

    if (result.length === 0) {
      return res.status(404).json({
        message: 'No se encontraron disponibilidades para los criterios proporcionados',
        criteria: { startDate, endDate, guests },
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('Error al obtener disponibilidad por rango y pasajeros:', error);
    return res.status(500).json({
      message: 'Error al obtener disponibilidad por rango y pasajeros',
      error: error.message,
    });
  }
};


const updateAvailability = async (req, res) => {
    const { id } = req.params;
    const { roomId, date, isAvailable } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID de disponibilidad inválido' });
    }

    const updateFields = {};

    if (roomId !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ message: 'ID de habitación inválido' });
        }
        updateFields.roomId = roomId;
    }

    if (date !== undefined) {
        if (isNaN(Date.parse(date))) {
            return res.status(400).json({ message: 'Fecha inválida' });
        }
        const inputDate = new Date(date);
        updateFields.date = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
    }

    if (isAvailable !== undefined) {
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ message: 'El estado de disponibilidad debe ser booleano' });
        }
        updateFields.isAvailable = isAvailable;
    }

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
    }

    try {
        const updatedAvailability = await Availability.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedAvailability) {
            return res.status(404).json({ message: 'Disponibilidad no encontrada' });
        }

        res.json({
            message: 'Disponibilidad actualizada exitosamente',
            availability: updatedAvailability,
        });
    } catch (error) {
        console.error('Error al actualizar disponibilidad:', error);
        res.status(500).json({
            message: 'Error al actualizar disponibilidad',
            error: error.message,
        });
    }
};

const deleteAvailability = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de disponibilidad inválido' });
    }

    const deletedAvailability = await Availability.findByIdAndDelete(id);

    if (!deletedAvailability) {
      return res.status(404).json({ message: 'Disponibilidad no encontrada' });
    }

    res.json({ message: 'Disponibilidad eliminada correctamente', deletedAvailability });
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    res.status(500).json({
      message: 'Error al eliminar disponibilidad',
      error: error.message,
    });
  }
};


module.exports = { 
  setAvailability, 
  getAvailability, 
  getAvailabilityById, 
  updateAvailability, 
  deleteAvailability,
  findAvailableRooms, // Ahora solo hay una versión
  initAvailability 
};