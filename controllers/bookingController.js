const Booking = require('../models/Booking');
const Availability = require('../models/Availability');

const createBooking = async (req, res) => {
  try {
    const { userId, roomId, checkInDate, checkOutDate, totalPrice } = req.body;

    // Verificar disponibilidad
    const availability = await Availability.find({
      roomId,
      date: { $gte: new Date(checkInDate), $lte: new Date(checkOutDate) },
      isAvailable: true,
    });

    const days = (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24);
    if (availability.length !== days) {
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

    // Actualizar disponibilidad
    await Availability.updateMany(
      { roomId, date: { $gte: new Date(checkInDate), $lte: new Date(checkOutDate) } },
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

    // Si se actualizan fechas o habitación, verificar disponibilidad
    if (checkInDate || checkOutDate || roomId) {
      const newCheckIn = checkInDate ? new Date(checkInDate) : (await Booking.findById(id)).checkInDate;
      const newCheckOut = checkOutDate ? new Date(checkOutDate) : (await Booking.findById(id)).checkOutDate;
      const newRoomId = roomId || (await Booking.findById(id)).roomId;

      const availability = await Availability.find({
        roomId: newRoomId,
        date: { $gte: newCheckIn, $lte: newCheckOut },
        isAvailable: true,
      });

      const days = (new Date(newCheckOut) - new Date(newCheckIn)) / (1000 * 60 * 60 * 24);
      if (availability.length !== days) {
        return res.status(400).json({
          message: 'La habitación no está disponible en las fechas solicitadas',
        });
      }

      // Actualizar disponibilidad si se cambian las fechas o la habitación
      if (checkInDate || checkOutDate || roomId) {
        const originalBooking = await Booking.findById(id);
        await Availability.updateMany(
          { roomId: originalBooking.roomId, date: { $gte: originalBooking.checkInDate, $lte: originalBooking.checkOutDate } },
          { isAvailable: true }
        );
        await Availability.updateMany(
          { roomId: newRoomId, date: { $gte: newCheckIn, $lte: newCheckOut } },
          { isAvailable: false }
        );
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(id, { userId, roomId, checkInDate, checkOutDate, totalPrice, status }, { new: true });
    if (!updatedBooking) {
      return res.status(404).json({
        message: 'Reserva no encontrada',
      });
    }
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
      { roomId: deletedBooking.roomId, date: { $gte: deletedBooking.checkInDate, $lte: deletedBooking.checkOutDate } },
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