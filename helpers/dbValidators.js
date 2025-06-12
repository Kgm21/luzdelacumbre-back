const User = require('../models/user');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

const isValidUser = async (id) => {
  const user = await User.findById(id);
  if (!user || !user.isActive) {
    throw new Error(`El usuario con ID ${id} no existe o está inactivo`);
  }
};

const isValidRoom = async (id) => {
  const room = await Room.findById(id);
  if (!room || !room.isAvailable) {
    throw new Error(`La habitación con ID ${id} no existe o no está disponible`);
  }
};

const isValidBooking = async (id) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new Error(`La reserva con ID ${id} no existe`);
  }
};

const isValidEmail = async (email) => {
  const user = await User.findOne({ email });
  if (user) {
    throw new Error(`El correo ${email} ya está registrado`);
  }
};

const isValidRoomNumber = async (roomNumber) => {
  const room = await Room.findOne({ roomNumber });
  if (room) {
    throw new Error(`El número de habitación ${roomNumber} ya está registrado`);
  }
};

module.exports = {
  isValidUser,
  isValidRoom,
  isValidBooking,
  isValidEmail,
  isValidRoomNumber,
};