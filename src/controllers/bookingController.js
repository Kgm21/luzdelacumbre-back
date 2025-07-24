// src/controllers/bookingController.js
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { syncAvailabilityUtil } = require('./availabilityController'); // 👈 importar utilidad

const createBooking = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, roomId } = req.body;

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      return res.status(400).json({ message: 'La fecha de check-out debe ser posterior a la de check-in.' });
    }

    const room = await Room.findById(roomId);
    if (!room || !room.isAvailable) {
      return res.status(400).json({ message: 'La cabaña seleccionada no está disponible.' });
    }

    // Podrías agregar aquí validación para conflictos con otras reservas.

    const booking = new Booking(req.body);
    await booking.save();

    await syncAvailabilityUtil();

    return res.status(201).json({ message: 'Reserva creada', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear reserva', error: error.message });
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('roomId');
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener reservas', error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('roomId');
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });
    return res.json(booking);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener reserva', error: error.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada' });

    await syncAvailabilityUtil(); // 👈 sincroniza después de actualizar

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
