const Booking = require('../models/Booking');
const Availability = require('../models/Availability');

const createBooking = async (req, res) => {
  const { userId, roomId, checkInDate, checkOutDate, totalPrice } = req.body;

  // Validaciones previas
  if (!userId || !roomId || !checkInDate || !checkOutDate || typeof totalPrice !== 'number') {
    return res.status(400).json({ message: 'Datos incompletos o inválidos' });
  }

  if (isNaN(Date.parse(checkInDate)) || isNaN(Date.parse(checkOutDate))) {
    return res.status(400).json({ message: 'Fechas inválidas' });
  }

  if (new Date(checkOutDate) <= new Date(checkInDate)) {
    return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la de entrada' });
  }

  const nights = (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24);
  if (nights < 1) {
    return res.status(400).json({ message: 'La reserva debe ser de al menos una noche' });
  }

  try {
    // Verificar disponibilidad
    const availability = await Availability.find({
      roomId,
      date: { $gte: new Date(checkInDate), $lt: new Date(checkOutDate) }, // < para evitar reservar también la noche de salida
      isAvailable: true,
    });

    if (availability.length !== nights) {
      return res.status(400).json({
        message: 'La habitación no está disponible en las fechas solicitadas',
      });
    }

    const newBooking = new Booking({
      userId,
      roomId,
      checkInDate,
      checkOutDate,
      totalPrice,
      status: 'confirmed',
    });
    await newBooking.save();

    // Marcar como no disponible los días reservados
    await Availability.updateMany(
      { roomId, date: { $gte: new Date(checkInDate), $lt: new Date(checkOutDate) } },
      { isAvailable: false }
    );

    res.status(201).json({
      message: 'Reserva creada',
      booking: newBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al crear la reserva',
      error: error.message,
    });
  }
};


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
      return res.status(404).json({
        message: 'Reserva no encontrada',
      });
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
  try {
    const { id } = req.params;
    const { userId, roomId, checkInDate, checkOutDate, totalPrice, status } = req.body;
    if (totalPrice !== undefined && typeof totalPrice !== 'number') {
       return res.status(400).json({ message: 'El precio total debe ser un número' });
    }

    const originalBooking = await Booking.findById(id);
    if (!originalBooking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const newRoomId = roomId || originalBooking.roomId;
    const newCheckIn = checkInDate ? new Date(checkInDate) : originalBooking.checkInDate;
    const newCheckOut = checkOutDate ? new Date(checkOutDate) : originalBooking.checkOutDate;

    if (newCheckOut <= newCheckIn) {
      return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la de entrada' });
    }

    const days = (newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24);
    if (days < 1) {
      return res.status(400).json({ message: 'La reserva debe ser de al menos una noche' });
    }

    // Si cambió la habitación o las fechas, verificar disponibilidad
    const datesChanged =
      newRoomId.toString() !== originalBooking.roomId.toString() ||
      newCheckIn.getTime() !== originalBooking.checkInDate.getTime() ||
      newCheckOut.getTime() !== originalBooking.checkOutDate.getTime();

    if (datesChanged) {
      const availability = await Availability.find({
        roomId: newRoomId,
        date: { $gte: newCheckIn, $lt: newCheckOut },
        isAvailable: true,
      });

      if (availability.length !== days) {
        return res.status(400).json({
          message: 'La habitación no está disponible en las nuevas fechas',
        });
      }

      // Restaurar disponibilidad antigua
      await Availability.updateMany(
        {
          roomId: originalBooking.roomId,
          date: { $gte: originalBooking.checkInDate, $lt: originalBooking.checkOutDate },
        },
        { isAvailable: true }
      );

      // Bloquear nuevas fechas
      await Availability.updateMany(
        {
          roomId: newRoomId,
          date: { $gte: newCheckIn, $lt: newCheckOut },
        },
        { isAvailable: false }
      );
    }

    // Actualizar reserva
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        userId: userId || originalBooking.userId,
        roomId: newRoomId,
        checkInDate: newCheckIn,
        checkOutDate: newCheckOut,
        totalPrice: typeof totalPrice === 'number' ? totalPrice : originalBooking.totalPrice,
        status: status || originalBooking.status,
      },
      { new: true }
    );

    res.json({
      message: 'Reserva actualizada',
      booking: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar la reserva',
      error: error.message,
    });
  }
};


const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBooking = await Booking.findByIdAndDelete(id);
    if (!deletedBooking) {
      return res.status(404).json({
        message: 'Reserva no encontrada',
      });
    }

    // Restaurar disponibilidad
    await Availability.updateMany(
  {
    roomId: deletedBooking.roomId,
    date: { $gte: deletedBooking.checkInDate, $lt: deletedBooking.checkOutDate }
  },
  { isAvailable: true }
);

    res.json({
      message: 'Reserva eliminada',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al eliminar la reserva',
      error: error.message,
    });
  }
};

module.exports = { createBooking, getBookings, getBookingById, updateBooking, deleteBooking };