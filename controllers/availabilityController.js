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
        const { roomId, startDate, endDate, guests } = req.query; // Ahora esperamos 'guests'

        console.log('--- getAvailability (Range & Guests) Start ---');
        console.log('Query received - roomId:', roomId, 'startDate:', startDate, 'endDate:', endDate, 'guests:', guests);

        const queryDateRange = {};
        let datesToCheck = [];
        let minCapacity = null;

        // --- Validación y construcción del rango de fechas ---
        if (startDate && typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
            endDate && typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            
            const start = new Date(Date.UTC(parseInt(startDate.substring(0,4)), parseInt(startDate.substring(5,7)) - 1, parseInt(startDate.substring(8,10)), 0, 0, 0, 0));
            const end = new Date(Date.UTC(parseInt(endDate.substring(0,4)), parseInt(endDate.substring(5,7)) - 1, parseInt(endDate.substring(8,10)), 0, 0, 0, 0));

            if (start >= end) {
                return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la fecha de fin.' });
            }

            for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
                datesToCheck.push(new Date(d));
            }
            
            if (datesToCheck.length === 0) {
                 return res.status(400).json({ message: 'Rango de fechas inválido o sin días válidos.' });
            }

            queryDateRange.$in = datesToCheck;
            
            console.log('Dates to check for range:', datesToCheck.map(d => d.toISOString().substring(0, 10)));

        } else if (startDate || endDate) {
            return res.status(400).json({ message: 'Por favor, proporcione un rango de fechas válido (YYYY-MM-DD).' });
        } else {
            console.log('No se proporcionó rango de fechas. La consulta puede ser muy amplia.');
            // Considerar añadir un límite o paginación aquí si no se proporciona rango.
        }

        // --- Validación de la cantidad de pasajeros (guests) ---
        if (guests) {
            const parsedGuests = parseInt(guests);
            if (isNaN(parsedGuests) || parsedGuests <= 0) {
                return res.status(400).json({ message: 'Cantidad de pasajeros (guests) inválida. Debe ser un número positivo.' });
            }
            minCapacity = parsedGuests; // Guardamos la capacidad mínima requerida
            console.log('Minimum capacity required (guests):', minCapacity);
        }

        const matchStage = {};
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            const roomObjectId = new mongoose.Types.ObjectId(roomId);
            const roomExists = await Room.exists({ _id: roomObjectId }); 
            if (!roomExists) {
                return res.status(404).json({ message: 'La habitación con ese ID no existe.' });
            }
            matchStage.roomId = roomObjectId;
        } else if (roomId) {
            return res.status(400).json({ message: 'ID de habitación inválido.' });
        }

        if (Object.keys(queryDateRange).length > 0) {
            matchStage.date = queryDateRange;
        }

        console.log('MongoDB Aggregation Match Object (RAW):', matchStage);

        const pipeline = [
            { $match: matchStage }, // 1. Primer filtro (roomId y/o rango de fechas)
            {
                $group: { // 2. Agrupar por roomId para verificar todas las fechas
                    _id: "$roomId",
                    countDatesAvailable: { 
                        $sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] } // Contar solo las que son 'true'
                    },
                    totalDatesInQuery: { $sum: 1 } // Contar todos los documentos encontrados para ese roomId y rango
                }
            },
            {
                $match: { // 3. Asegurar que todas las fechas del rango estén disponibles
                    $expr: {
                        $and: [
                            { $eq: ["$countDatesAvailable", datesToCheck.length] },
                            { $eq: ["$totalDatesInQuery", datesToCheck.length] }
                        ]
                    }
                }
            },
            {
                $lookup: { // 4. Unir con la colección de habitaciones
                    from: 'habitacions',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'habitacion'
                }
            },
            { $unwind: '$habitacion' }, // 5. Desenrollar la habitación
            { $match: { 'habitacion.isAvailable': true } } // 6. Filtro por disponibilidad general de la habitación
        ];

        // 7. Añadir el filtro de capacidad si se proporcionó el parámetro 'guests'
        if (minCapacity !== null) {
            pipeline.push({
                $match: {
                    'habitacion.capacity': { $gte: minCapacity } // La capacidad de la habitación debe ser mayor o igual a los huéspedes solicitados
                }
            });
        }

        // 8. Proyectar los campos finales
        pipeline.push({
            $project: {
                _id: "$_id", // El roomId
                roomNumber: "$habitacion.roomNumber",
                type: "$habitacion.type",
                price: "$habitacion.price",
                capacity: "$habitacion.capacity",
                imageUrls: "$habitacion.imageUrls",
                description: "$habitacion.description",
                // isAvailable: "$habitacion.isAvailable", // No es estrictamente necesario ya que ya filtramos por esto
            }
        });


        // Serialización del pipeline para Compass
        console.log('Full Aggregation Pipeline (for Compass - RANGE & GUESTS):', JSON.stringify(pipeline, (key, value) => {
            if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
                return { "$oid": value.toHexString() };
            }
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        }, 2));

        console.log('Ejecutando agregación para rango y pasajeros...');
        const result = await Availability.aggregate(pipeline);

        console.log('Aggregation Results Count:', result.length);
        console.log('Aggregation Results Data:', JSON.stringify(result, null, 2));

        if (result.length === 0) {
            console.log('No se encontraron disponibilidades para los criterios.');
            return res.status(404).json({
                message: 'No se encontraron disponibilidades para los criterios proporcionados',
                criteria: { roomId, startDate, endDate, guests }
            });
        }

        console.log('Disponibilidades encontradas, retornando resultados.');
        return res.json(result);

    } catch (error) {
        console.error('Error al obtener disponibilidad por rango y pasajeros:', error);
        return res.status(500).json({
            message: 'Error al obtener disponibilidad por rango y pasajeros',
            error: error.message,
        });
    } finally {
        console.log('--- getAvailability (Range & Guests) End ---');
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
        const { roomId, startDate, endDate, guests } = req.query;

        const queryDateRange = {};
        let datesToCheck = [];
        let minCapacity = null;

        if (startDate && typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
            endDate && typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            
            const start = new Date(Date.UTC(parseInt(startDate.substring(0,4)), parseInt(startDate.substring(5,7)) - 1, parseInt(startDate.substring(8,10)), 0, 0, 0, 0));
            const end = new Date(Date.UTC(parseInt(endDate.substring(0,4)), parseInt(endDate.substring(5,7)) - 1, parseInt(endDate.substring(8,10)), 0, 0, 0, 0));
            
            if (start >= end) {
                return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la fecha de fin.' });
            }

            for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
                datesToCheck.push(new Date(d));
            }
            
            if (datesToCheck.length === 0) {
                 return res.status(400).json({ message: 'Rango de fechas inválido o sin días válidos.' });
            }

            queryDateRange.$in = datesToCheck;
            
        } else if (startDate || endDate) {
            return res.status(400).json({ message: 'Por favor, proporcione un rango de fechas válido (YYYY-MM-DD).' });
        } else {
            // Este bloque se ejecuta si no se proporcionan startDate ni endDate.
            // Para 'available-rooms' normalmente esperas fechas.
            // Si la ruta GET '/' también usa esta función sin fechas, se debe ajustar la lógica aquí.
            return res.status(400).json({ message: 'Las fechas de inicio y fin son obligatorias para buscar habitaciones disponibles.' });
        }

        if (guests) {
            const parsedGuests = parseInt(guests);
            if (isNaN(parsedGuests) || parsedGuests <= 0) {
                return res.status(400).json({ message: 'Cantidad de pasajeros (guests) inválida. Debe ser un número positivo.' });
            }
            minCapacity = parsedGuests;
        }

        const matchStage = {};
        if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
            const roomObjectId = new mongoose.Types.ObjectId(roomId);
            const roomExists = await Room.exists({ _id: roomObjectId }); 
            if (!roomExists) {
                return res.status(404).json({ message: 'La habitación con ese ID no existe.' });
            }
            matchStage.roomId = roomObjectId;
        } else if (roomId) {
            return res.status(400).json({ message: 'ID de habitación inválido.' });
        }

        if (Object.keys(queryDateRange).length > 0) {
            matchStage.date = queryDateRange;
        }

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
                    from: 'habitacions',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'habitacion'
                }
            },
            { $unwind: '$habitacion' },
            { $match: { 'habitacion.isAvailable': true } }
        ];

        if (minCapacity !== null) {
            pipeline.push({
                $match: {
                    'habitacion.capacity': { $gte: minCapacity }
                }
            });
        }

        pipeline.push({
            $project: {
                _id: "$_id",
                roomNumber: "$habitacion.roomNumber",
                type: "$habitacion.type",
                price: "$habitacion.price",
                capacity: "$habitacion.capacity",
                imageUrls: "$habitacion.imageUrls",
                description: "$habitacion.description"
            }
        });

        const result = await Availability.aggregate(pipeline);

        if (result.length === 0) {
            return res.status(404).json({
                message: 'No se encontraron disponibilidades para los criterios proporcionados',
                criteria: { roomId, startDate, endDate, guests }
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