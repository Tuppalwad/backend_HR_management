const { Router } = require('express');
const multer = require('multer');
const { uploadLogo } = require('../controller/image');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

router.post('/uploadlogo', upload.single('Logoimg'), uploadLogo);

module.exports = router;
