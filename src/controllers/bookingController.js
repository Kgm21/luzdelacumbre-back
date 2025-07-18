const Booking = require('../models/Booking');
const Availability = require('../models/Availability');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/user')

const MIN_NIGHTS = 5;

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { roomId, checkInDate, checkOutDate, passengersCount, userId: userIdFromBody } = req.body;

    // Convertir passengersCount a número
    passengersCount = Number(passengersCount);

    // Determinar userId final según rol
    let userId;

    if (req.user.role === 'admin') {
      if (!userIdFromBody) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'El administrador debe especificar un usuario para la reserva' });
      }
      userId = userIdFromBody.toString();
    } else {
      userId = req.user._id.toString();
    }

    // Validación básica de datos
    if (
      !userId ||
      !roomId ||
      !checkInDate ||
      !checkOutDate ||
      !Number.isInteger(passengersCount) ||
      passengersCount < 1 ||
      passengersCount > 6
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Datos incompletos o inválidos, incluyendo cantidad de pasajeros (1-6)' });
    }

    // Validar que el usuario exista
    const userExists = await User.findById(userId);
    if (!userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar fechas
    const startRaw = new Date(checkInDate);
    const endRaw = new Date(checkOutDate);
    const start = new Date(Date.UTC(startRaw.getUTCFullYear(), startRaw.getUTCMonth(), startRaw.getUTCDate()));
    const end = new Date(Date.UTC(endRaw.getUTCFullYear(), endRaw.getUTCMonth(), endRaw.getUTCDate()));

    if (isNaN(start) || isNaN(end) || end <= start) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
    }

    // Validar duración mínima (MIN_NIGHTS debe estar definido)
    if (typeof MIN_NIGHTS !== "number") {
      // definir un valor por defecto
      MIN_NIGHTS = 1;
    }
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (nights < MIN_NIGHTS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `La reserva debe ser de al menos ${MIN_NIGHTS} noche(s)` });
    }

    // Buscar habitación y validar capacidad
    const room = await Room.findById(roomId);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    if (passengersCount > room.capacity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `La habitación tiene una capacidad máxima de ${room.capacity} personas`
      });
    }

    const totalPrice = room.price * nights;

    // Generar array de fechas
    const dates = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    // Verificar disponibilidad
    const availability = await Availability.find({
      roomId,
      date: { $in: dates },
      isAvailable: true,
    }).session(session);

    if (availability.length !== dates.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: 'La habitación no está disponible en las fechas solicitadas' });
    }

    // Crear reserva
    const newBooking = new Booking({
      userId,
      roomId,
      checkInDate: start,
      checkOutDate: end,
      totalPrice,
      passengersCount,
      status: 'confirmed',
    });

    await newBooking.save({ session });

    // Bloquear fechas en Availability
    await Availability.updateMany(
      { roomId, date: { $in: dates } },
      { $set: { isAvailable: false } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: 'Reserva creada', booking: newBooking });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({ message: 'Error al crear la reserva', error: error.message });
  }
};


async function regularizeBookings() {
  try {
    // Evita conectar nuevamente si ya hay conexión activa
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/tu_basedatos', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    const bookings = await Booking.find({});
    console.log(`Total reservas: ${bookings.length}`);

    let count = 0;
    for (const booking of bookings) {
      const checkIn = booking.checkInDate;
      const checkOut = booking.checkOutDate;
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      if (nights < MIN_NIGHTS && booking.status !== 'needs_review') {
        booking.status = 'needs_review';
        await booking.save();
        count++;
        console.log(`Reserva ${booking._id} marcada para revisión (tiene ${nights} noches)`);
      }
    }

    console.log(`Total reservas marcadas para revisión: ${count}`);

    // No desconectes si no abriste conexión aquí para evitar problemas en apps persistentes
    // await mongoose.disconnect();

  } catch (error) {
    console.error('Error al regularizar reservas:', error);
  }
}

// regularizeBookings();  // Solo llama esta función desde un script separado o un job para evitar problemas
const getBookings = async (req, res) => {
  try {
    const { past } = req.query;
    const pastNormalized = (past || '').toLowerCase();

    // Fecha de hoy, sin hora para comparación solo por día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filter = {};

    if (pastNormalized === 'true') {
      // Reservas que ya terminaron (checkOutDate < hoy)
      filter.checkOutDate = { $lt: today };
    } else if (pastNormalized === 'false') {
      // Reservas activas (checkOutDate >= hoy)
      filter.checkOutDate = { $gte: today };
    }

    const bookings = await Booking.find(filter)
      .populate('userId')
      .populate('roomId');

    const formattedBookings = bookings.map(booking => ({
      ...booking.toObject(),
      id: booking._id.toString(),
    }));

    res.json({
      data: formattedBookings,
      total: formattedBookings.length,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener las reservas',
      error: error.message,
    });
  }
};




const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('userId').populate('roomId');
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const formattedBooking = {
      ...booking.toObject(),
      id: booking._id.toString(),
    };

    res.json(formattedBooking);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener la reserva',
      error: error.message,
    });
  }
};


const updateBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { userId, roomId, checkInDate, checkOutDate, passengersCount, status } = req.body;

    // Buscar reserva original
    const originalBooking = await Booking.findById(id).session(session);
    if (!originalBooking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Validaciones básicas
    if (
      passengersCount !== undefined &&
      (typeof passengersCount !== 'number' ||
        !Number.isInteger(passengersCount) ||
        passengersCount < 1 ||
        passengersCount > 6)
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cantidad de pasajeros inválida (1-6)' });
    }

    const start = checkInDate ? new Date(checkInDate) : originalBooking.checkInDate;
    const end = checkOutDate ? new Date(checkOutDate) : originalBooking.checkOutDate;

    if (isNaN(start) || isNaN(end) || end <= start) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
    }

    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (nights < MIN_NIGHTS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `La reserva debe ser de al menos ${MIN_NIGHTS} noche(s)` });
    }

    const newRoomId = roomId || originalBooking.roomId.toString();
    const room = await Room.findById(newRoomId).session(session);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    const newPassengersCount = passengersCount !== undefined ? passengersCount : originalBooking.passengersCount;
    if (newPassengersCount > room.capacity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `La habitación tiene una capacidad máxima de ${room.capacity} personas`,
      });
    }

    // Revisar si fechas o habitación cambiaron
    const datesChanged =
      start.getTime() !== originalBooking.checkInDate.getTime() ||
      end.getTime() !== originalBooking.checkOutDate.getTime() ||
      newRoomId !== originalBooking.roomId.toString();

    if (datesChanged) {
      // Crear array con todas las fechas nuevas
      const newDates = [];
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        newDates.push(new Date(d.getTime()));
      }

      // Verificar disponibilidad para las nuevas fechas y nueva habitación
      // Excluir la reserva actual para evitar falsos conflictos
      const conflictingAvailability = await Availability.find({
        roomId: newRoomId,
        date: { $in: newDates },
        isAvailable: false,
      }).session(session);

      // Filtrar fechas ocupadas que no correspondan a la reserva actual
      const conflictingDates = conflictingAvailability.filter((avail) => {
        return !originalBooking.checkInDate ||
          !originalBooking.checkOutDate ||
          newRoomId !== originalBooking.roomId.toString() ||
          avail.date < originalBooking.checkInDate ||
          avail.date >= originalBooking.checkOutDate;
      });

      if (conflictingDates.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ message: 'La habitación no está disponible en las nuevas fechas' });
      }

      // Liberar fechas antiguas si la habitación o fechas cambiaron
      if (
        newRoomId !== originalBooking.roomId.toString() ||
        start.getTime() !== originalBooking.checkInDate.getTime() ||
        end.getTime() !== originalBooking.checkOutDate.getTime()
      ) {
        const oldDates = [];
        for (let d = new Date(originalBooking.checkInDate); d < originalBooking.checkOutDate; d.setDate(d.getDate() + 1)) {
          oldDates.push(new Date(d.getTime()));
        }

        await Availability.updateMany(
          { roomId: originalBooking.roomId, date: { $in: oldDates } },
          { $set: { isAvailable: true } },
          { session }
        );
      }

      // Bloquear nuevas fechas
      await Availability.updateMany(
        { roomId: newRoomId, date: { $in: newDates } },
        { $set: { isAvailable: false } },
        { session }
      );

      originalBooking.checkInDate = start;
      originalBooking.checkOutDate = end;
      originalBooking.roomId = newRoomId;
    }

    // Actualizar otros campos
    originalBooking.passengersCount = newPassengersCount;
    if (userId) originalBooking.userId = userId;
    if (status) originalBooking.status = status;

    // Recalcular precio total
    originalBooking.totalPrice = room.price * nights;

    await originalBooking.save({ session });

    // Poblar userId y roomId para devolver datos completos
    const populatedBooking = await Booking.findById(id)
      .populate('userId')
      .populate('roomId')
      .session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Reserva actualizada',
      booking: {
        ...populatedBooking.toObject(),
        id: populatedBooking._id.toString(),
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al actualizar la reserva:', error);
    res.status(500).json({ message: 'Error al actualizar la reserva', error: error.message });
  }
};


const deleteBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).session(session);
    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const dates = [];
    for (let d = new Date(booking.checkInDate); d < booking.checkOutDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    await Availability.updateMany(
      { roomId: booking.roomId, date: { $in: dates } },
      { $set: { isAvailable: true } },
      { session }
    );

    await Booking.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Reserva eliminada y fechas liberadas' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar la reserva', error: error.message });
  }
};
const getMyBookings = async (req, res) => {
  try {
    console.log("Usuario autenticado:", req.user);
    const reservas = await Reserva.find({ userId: req.user._id }).populate('roomId');
    res.json({ ok: true, reservas });
  } catch (error) {
    console.error('Error al obtener mis reservas', error);
    res.status(500).json({
      ok: false,
      message: 'Error al obtener mis reservas'
    });
  }
};


const deleteMyBooking = async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user._id;

  try {
    const reserva = await Reserva.findById(bookingId);

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Validar si la reserva tiene asignado un usuario
    if (!reserva.userId) {
      return res.status(400).json({ message: 'La reserva no tiene un usuario asignado' });
    }

    if (reserva.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No puedes cancelar esta reserva' });
    }

    await Reserva.findByIdAndDelete(bookingId);

    return res.json({ ok: true, message: 'Reserva cancelada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al cancelar la reserva' });
  }
};

module.exports = { createBooking, getBookings, getBookingById, updateBooking, deleteBooking,getMyBookings,deleteMyBooking}
