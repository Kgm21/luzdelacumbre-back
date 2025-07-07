const User = require('../models/user');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');


const isValidUser = async (id) => {
  const user = await User.findById(id);
  if (!user || !user.isActive) {
    throw new Error(`El usuario con ID ${id} no existe o está inactivo`);
  }
};

const isValidRoom = async (id) => {
  const room = await Room.findById(id);
  if (!room) {
    throw new Error(`La habitación con ID ${id} no existe`);
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

const isValidRoomNumber = async (roomNumber, { req }) => {
  const roomId = req.params.id;
  const existingRoom = await Room.findOne({ roomNumber });

   if (existingRoom && existingRoom._id.toString() !== roomId) {
    throw new Error(`El número de habitación ${roomNumber} ya está registrado`);
  }

  return true;
};

module.exports = {
  isValidUser,
  isValidRoom,
  isValidBooking,
  isValidEmail,
  isValidRoomNumber,
};