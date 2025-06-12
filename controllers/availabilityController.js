const Availability = require('../models/Availability');

const setAvailability = async (req, res) => {
  try {
    const { roomId, date, isAvailable } = req.body;
    const availability = await Availability.findOneAndUpdate(
      { roomId, date },
      { isAvailable },
      { upsert: true, new: true }
    );
    res.json({
      message: 'Disponibilidad actualizada',
      availability,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar disponibilidad',
      error: error.message,
    });
  }
};

const getAvailability = async (req, res) => {
  try {
    const availability = await Availability.find().populate('roomId');
    res.json(availability);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener disponibilidad',
      error: error.message,
    });
  }
};

const getAvailabilityById = async (req, res) => {
  try {
    const { id } = req.params;
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

const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId, date, isAvailable } = req.body;
    const updatedAvailability = await Availability.findByIdAndUpdate(id, { roomId, date, isAvailable }, { new: true });
    if (!updatedAvailability) {
      return res.status(404).json({
        message: 'Disponibilidad no encontrada',
      });
    }
    res.json({
      message: 'Disponibilidad actualizada',
      availability: updatedAvailability,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al actualizar disponibilidad',
      error: error.message,
    });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
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
    res.status(500).json({
      message: 'Error al eliminar disponibilidad',
      error: error.message,
    });
  }
};

module.exports = { setAvailability, getAvailability, getAvailabilityById, updateAvailability, deleteAvailability };