const Booking = require('../models/Booking');
const Availability = require('../models/Availability');
const mongoose = require('mongoose');
const Room = require('../models/Room');

const MIN_NIGHTS = 5;  

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, roomId, checkInDate, checkOutDate, passengersCount } = req.body;

    // Validación básica
    if (
      !userId ||
      !roomId ||
      !checkInDate ||
      !checkOutDate ||
      typeof passengersCount !== 'number' ||
      !Number.isInteger(passengersCount) ||
      passengersCount < 1 ||
      passengersCount > 6
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Datos incompletos o inválidos, incluyendo cantidad de pasajeros (1-6)' });
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

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

    // Crear array con todas las fechas de la reserva
    const dates = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
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
    const bookings = await Booking.find().populate('userId').populate('roomId');
    res.json(bookings);
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
    res.json(booking);
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
    const { userId, roomId, checkInDate, checkOutDate, status, passengersCount } = req.body;

    const originalBooking = await Booking.findById(id).session(session);
    if (!originalBooking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const newRoomId = roomId || originalBooking.roomId;
    const newCheckIn = checkInDate ? new Date(checkInDate) : originalBooking.checkInDate;
    const newCheckOut = checkOutDate ? new Date(checkOutDate) : originalBooking.checkOutDate;

    if (isNaN(newCheckIn) || isNaN(newCheckOut) || newCheckOut <= newCheckIn) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Fechas inválidas o mal ordenadas' });
    }

    const nights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'La reserva debe ser de al menos una noche' });
    }

    let validPassengersCount = originalBooking.passengersCount;
    if (passengersCount !== undefined) {
      if (
        typeof passengersCount !== 'number' ||
        !Number.isInteger(passengersCount) ||
        passengersCount < 1 ||
        passengersCount > 6
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Cantidad de pasajeros inválida, debe estar entre 1 y 6' });
      } else {
        validPassengersCount = passengersCount;
      }
    }

    const room = await Room.findById(newRoomId);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    if (validPassengersCount > room.capacity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `La habitación tiene una capacidad máxima de ${room.capacity} personas`
      });
    }

    const dates = [];
    for (let d = new Date(newCheckIn); d < newCheckOut; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const datesChanged =
      newRoomId.toString() !== originalBooking.roomId.toString() ||
      newCheckIn.getTime() !== originalBooking.checkInDate.getTime() ||
      newCheckOut.getTime() !== originalBooking.checkOutDate.getTime();

    if (datesChanged) {
      const availability = await Availability.find({
        roomId: newRoomId,
        date: { $in: dates },
        isAvailable: true,
      }).session(session);

      if (availability.length !== dates.length) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ message: 'La habitación no está disponible en las nuevas fechas' });
      }

      // Restaurar disponibilidad antigua
      const oldDates = [];
      for (let d = new Date(originalBooking.checkInDate); d < originalBooking.checkOutDate; d.setDate(d.getDate() + 1)) {
        oldDates.push(new Date(d));
      }
      await Availability.updateMany(
        { roomId: originalBooking.roomId, date: { $in: oldDates } },
        { $set: { isAvailable: true } },
        { session }
      );

      // Bloquear nuevas fechas
      await Availability.updateMany(
        { roomId: newRoomId, date: { $in: dates } },
        { $set: { isAvailable: false } },
        { session }
      );
    }

    const totalPrice = room.price * nights;

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        userId: userId || originalBooking.userId,
        roomId: newRoomId,
        checkInDate: newCheckIn,
        checkOutDate: newCheckOut,
        totalPrice,
        status: status || originalBooking.status,
        passengersCount: validPassengersCount,
      },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Reserva actualizada', booking: updatedBooking });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
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

module.exports = { createBooking, getBookings, getBookingById, updateBooking, deleteBooking };
