

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const {syncAvailabilityUtil }= require('../controllers/availabilityController');

const createBooking = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, roomId, userId, passengersCount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'roomId inválido' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'userId inválido' });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ message: 'Fechas inválidas.' });
    }

    if (checkIn >= checkOut) {
      return res.status(400).json({ message: 'La fecha de check-out debe ser posterior a la de check-in.' });
    }

    // Validar mínimo de 5 noches
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const MIN_NIGHTS = 5;
    if (nights < MIN_NIGHTS) {
      return res.status(400).json({ message: `La reserva debe ser de al menos ${MIN_NIGHTS} noches.` });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.isAvailable) {
      return res.status(400).json({ message: 'La cabaña seleccionada no está disponible.' });
    }

    // Validar que no haya reservas solapadas
    const existingBookings = await Booking.find({
      roomId,
      $or: [
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn }
        }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Ya existe una reserva para esa cabaña en las fechas indicadas.' });
    }

    if (typeof room.price !== 'number' || isNaN(room.price)) {
      return res.status(400).json({ message: 'La habitación no tiene un precio válido.' });
    }

    const totalPrice = parseFloat((room.price * nights).toFixed(2));
    if (isNaN(totalPrice)) {
      return res.status(400).json({ message: 'No se pudo calcular el precio total.' });
    }

    const booking = new Booking({
      userId,
      roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      passengersCount,
      totalPrice
    });

    await booking.save();

    await syncAvailabilityUtil();

    return res.status(201).json({ message: 'Reserva creada exitosamente', booking });
  } catch (error) {
    console.error('Error en createBooking:', error);
    return res.status(500).json({ message: 'Error al crear reserva', error: error.message });
  }
};




const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('roomId')     // ya lo tenías
      .populate('userId');    // 👉 agregá esto

    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener reservas', error: error.message });
  }
};


const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId')
      .populate('userId'); // 👈 necesario para traer nombre, email, etc.

    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    return res.json(booking);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener reserva', error: error.message });
  }
};


const updateBooking = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, roomId } = req.body;

    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        return res.status(400).json({ message: 'Fechas inválidas.' });
      }

      if (checkIn >= checkOut) {
        return res.status(400).json({ message: 'La fecha de check-out debe ser posterior a la de check-in.' });
      }

      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const MIN_NIGHTS = 5;
      if (nights < MIN_NIGHTS) {
        return res.status(400).json({ message: `La reserva debe ser de al menos ${MIN_NIGHTS} noches.` });
      }
    }

    // Validar roomId si viene en el body
    if (roomId && !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'roomId inválido' });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    await syncAvailabilityUtil(); // sincroniza después de actualizar

    return res.json({ message: 'Reserva actualizada', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar reserva', error: error.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    await syncAvailabilityUtil(); // 👈 sincroniza después de eliminar

    return res.json({ message: 'Reserva eliminada' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar reserva', error: error.message });
  }
};

const deleteMyBooking = async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user._id;

  try {
    const reserva = await Booking.findById(bookingId);

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    if (!reserva.userId) {
      return res.status(400).json({ message: 'La reserva no tiene un usuario asignado' });
    }

    if (reserva.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'No puedes cancelar esta reserva' });
    }

    await Booking.findByIdAndDelete(bookingId);

    await syncAvailabilityUtil(); // 👈 sincroniza después de eliminar

    return res.json({ ok: true, message: 'Reserva cancelada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al cancelar la reserva' });
  }
};

const getMyBookings = async (req, res) => {
  const userId = req.user._id;

  try {
    const bookings = await Booking.find({ userId }).populate('roomId');
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener tus reservas' });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  deleteMyBooking,
  getMyBookings,
};
