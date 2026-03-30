const express = require('express');
const {
  checkEmail,
  generateCertificateFile,
} = require('../controllers/certificateController');

const router = express.Router();

router.get('/check-email', checkEmail);
router.post('/generate-certificate', generateCertificateFile);

module.exports = router;
