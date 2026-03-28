const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { generateCertificate } = require('../utils/generateCertificate');

const CSV_PATH = path.join(__dirname, '../data/participants.csv');

// ─── Helper: Read all CSV rows ────────────────────────────────────────────────
function readCSV() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate-certificate
// Body: { email: "user@example.com" }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate-certificate', async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate input
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Read database
    const rows = await readCSV();

    // 3. Find participant
    const participant = rows.find(
      (r) => r.email.trim().toLowerCase() === normalizedEmail
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Email not registered.' });
    }

    // 4. Block organizers (and any non-allowed roles)
    const allowedRoles = ['Participant', 'Finalist'];
    if (!allowedRoles.includes(participant.role)) {
      return res.status(403).json({
        success: false,
        message: `Role "${participant.role}" is not eligible to receive a certificate.`,
      });
    }


    // 6. Generate PDF certificate in memory
    const pdfBuffer = await generateCertificate(participant);

    // 7. Send binary PDF directly — cert data passed via headers (no disk write)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DropOutHacks_Certificate_${participant.name.replace(/\s+/g, '_')}.pdf"`);
    res.setHeader('X-Cert-Name', encodeURIComponent(participant.name));
    res.setHeader('X-Cert-Team', encodeURIComponent(participant.team_name));
    res.setHeader('X-Cert-Role', encodeURIComponent(participant.role));
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating certificate:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/check-email?email=...
// Quick check without generating (for UX preview)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    const rows = await readCSV();
    const participant = rows.find(
      (r) => r.email.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (!participant) {
      return res.json({ found: false, message: 'Email not registered.' });
    }

    const allowedRoles = ['Participant', 'Finalist'];
    if (!allowedRoles.includes(participant.role)) {
      return res.json({ found: true, eligible: false, message: `Role "${participant.role}" is not eligible.` });
    }

    res.json({
      found: true,
      eligible: true,
      used: participant.used === 'true',
      name: participant.name,
      team_name: participant.team_name,
      role: participant.role,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
