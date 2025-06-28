const { Router } = require('express');
const router = Router();
const { createContact, getContact } = require('../controllers/contactController');

router.post('/', createContact);
router.get('/', getContact);

module.exports = router;
