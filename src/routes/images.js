const { Router } = require('express');
const { getImages } = require('../controllers/imagesController');

const router = Router();

router.get('/', getImages);

module.exports = router;
