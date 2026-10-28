const express = require('express');
const multer = require('multer');
const { importAssetsFromExcel } = require('../controller/assetImport');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.post('/upload', upload.single('excelFile'), importAssetsFromExcel);

module.exports = router;
