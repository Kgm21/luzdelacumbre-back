const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const Room = require('../models/Room');

const initAvailability = async (req, res) => {
  try {
    const rooms = await Room.find();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 5);

    const availabilitiesToInsert = [];

    for (const room of rooms) {
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Asegura que la fecha se guarde como inicio del día UTC
        const dateToStore = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
        
        availabilitiesToInsert.push({
          roomId: room._id,
          date: dateToStore,
          isAvailable: true,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const bulkOps = availabilitiesToInsert.map(({ roomId, date, isAvailable }) => ({
      updateOne: {
        filter: { roomId, date },
        update: { $set: { isAvailable } },
        upsert: true
      }
    }));

    await Availability.bulkWrite(bulkOps);

    res.json({ message: 'Disponibilidad generada por 5 meses para todas las habitaciones' });
  } catch (error) {
    console.error('Error al inicializar disponibilidad:', error);
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
        const { roomId, date } = req.query;

        console.log('--- getAvailability Start ---');
        console.log('Query received - roomId:', roomId, 'date:', date);

        const matchStage = {}; // Objeto para la primera etapa $match

        // --- Manejo y validación de roomId ---
        if (roomId) {
            if (!mongoose.Types.ObjectId.isValid(roomId)) {
                console.log('roomId inválido, retornando 400');
                return res.status(400).json({ message: 'ID de habitación inválido' });
            }
            
            // Verificamos si la habitación existe usando el ObjectId
            const roomObjectId = new mongoose.Types.ObjectId(roomId);
            const roomExists = await Room.exists({ _id: roomObjectId }); 
            
            console.log('Existencia habitación:', roomExists ? roomExists._id : null); // Loguea el _id si existe

            if (!roomExists) {
                console.log('Habitación no encontrada, retornando 404');
                return res.status(404).json({ message: 'La habitación con ese ID no existe' });
            }

            // Aquí es donde aseguramos el ObjectId para la agregación
            matchStage.roomId = roomObjectId; 
        } else {
            console.log('No se proporcionó roomId, no se agregará filtro de habitación.');
        }

        // --- Manejo y validación de date ---
        if (date) {
            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-').map(Number);
                const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
                
                console.log('Constructed Date Range (UTC) - Start:', startOfDayUTC.toISOString(), 'End:', endOfDayUTC.toISOString());
                matchStage.date = { $gte: startOfDayUTC, $lte: endOfDayUTC };
            } else {
                console.log('Fecha inválida detectada, retornando 400');
                return res.status(400).json({ message: 'Fecha inválida' });
            }
        } else {
            console.log('No se proporcionó fecha, no se agregará filtro de fecha.');
        }

        console.log('MongoDB Aggregation Match Object (JSON Stringify):', JSON.stringify(matchStage, null, 2));
        console.log('MongoDB Aggregation Match Object (RAW):', matchStage);

        // --- Construcción del Pipeline de Agregación ---
        const pipeline = [
            { $match: matchStage }, // Usa el objeto 'matchStage' que ya contiene el ObjectId
            {
                $lookup: {
                    from: 'habitacions', // ¡Este nombre de colección es CRUCIAL y debe ser EXACTO!
                    localField: 'roomId',
                    foreignField: '_id',
                    as: 'habitacion'
                }
            },
            { $unwind: '$habitacion' },
            { $match: { 'habitacion.isAvailable': true } } // Filtra por habitaciones marcadas como disponibles
        ];

        // --- Log del Pipeline para depuración (con serialización de ObjectId para Compass) ---
        console.log('Full Aggregation Pipeline (for Compass - FINAL):', JSON.stringify(pipeline, (key, value) => {
            if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
                return { "$oid": value.toHexString() }; // Formato para Compass
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        }, 2));

        console.log('Ejecutando agregación...');
        const result = await Availability.aggregate(pipeline);

        console.log('Aggregation Results Count:', result.length);
        console.log('Aggregation Results Data:', JSON.stringify(result, null, 2));

        if (result.length === 0) {
            console.log('No se encontraron disponibilidades para los criterios.');
            return res.status(404).json({
                message: 'No se encontraron disponibilidades para los criterios proporcionados',
                criteria: { roomId, date }
            });
        }

        console.log('Disponibilidades encontradas, retornando resultados.');
        return res.json(result);

    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        return res.status(500).json({
            message: 'Error al obtener disponibilidad',
            error: error.message,
        });
    } finally {
        console.log('--- getAvailability End ---');
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
      return res.status(404).json({
        message: 'Disponibilidad no encontrada',
      });
    }
    res.json(availability);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener disponibilidad',
      error: error.message,
    });
  }
};

// ** findAvailableRooms UNIFICADO Y CORREGIDO **
const findAvailableRooms = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ message: 'Fecha inválida o faltante' });
    }

    const inputDate = new Date(date);
    // Asegura que la fecha de búsqueda sea el inicio del día UTC
    const dateToSearch = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));

    // Buscar disponibilidades donde isAvailable sea true y la fecha coincida
    const available = await Availability.find({
      date: dateToSearch, // Usa la fecha UTC normalizada
      isAvailable: true,
    }).populate('roomId');

    const availableRooms = available
      .map((entry) => entry.roomId)
      .filter((room) => room !== null && room.isAvailable === true); // Filtra por habitaciones disponibles también

    res.json(availableRooms);
  } catch (error) {
    console.error('Error al buscar habitaciones disponibles:', error);
    res.status(500).json({
      message: 'Error al buscar habitaciones disponibles',
      error: error.message,
    });
  }
};

const updateAvailability = async (req, res) => {
  const { roomId, date, isAvailable } = req.body;
  const { id } = req.params;

  if (!roomId || !date || typeof isAvailable !== 'boolean') {
    return res.status(400).json({ message: 'Datos incompletos o inválidos' });
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ message: 'ID de habitación inválido' });
  }

  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ message: 'Fecha inválida' });
  }

  // Validación del ID de disponibilidad (el 'id' de los params)
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID de disponibilidad inválido' });
  }

  try {
    const inputDate = new Date(date);
    const dateToStore = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));

    const updatedAvailability = await Availability.findByIdAndUpdate(
      id,
      { roomId, date: dateToStore, isAvailable },
      { new: true }
    );

    if (!updatedAvailability) {
      return res.status(404).json({ message: 'Disponibilidad no encontrada' });
    }

    res.json({
      message: 'Disponibilidad actualizada',
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
            return res.status(404).json({
                message: 'Disponibilidad no encontrada',
            });
        }
        res.json({
            message: 'Disponibilidad eliminada',
        });
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