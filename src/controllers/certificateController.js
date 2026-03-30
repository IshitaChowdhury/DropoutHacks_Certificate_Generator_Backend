const { readParticipants, findParticipantByEmail } = require('../services/csvService');
const { generateCertificate } = require('../services/pdfService');

const ALLOWED_ROLES = ['Participant', 'Finalist'];

function isEligibleRole(role) {
  return ALLOWED_ROLES.includes(role);
}

async function checkEmail(req, res, next) {
  try {
    const { email } = req.query;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email required.' });
    }

    const participant = await findParticipantByEmail(email);

    if (!participant) {
      return res.json({ found: false, message: 'Email not registered.' });
    }

    if (!isEligibleRole(participant.role)) {
      return res.json({
        found: true,
        eligible: false,
        message: `Role "${participant.role}" is not eligible.`,
      });
    }

    return res.json({
      found: true,
      eligible: true,
      used: participant.used === 'true',
      name: participant.name,
      team_name: participant.team_name,
      role: participant.role,
    });
  } catch (error) {
    return next(error);
  }
}

async function generateCertificateFile(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const rows = await readParticipants();
    const participant = rows.find(
      (row) => row.email.trim().toLowerCase() === normalizedEmail
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Email not registered.' });
    }

    if (!isEligibleRole(participant.role)) {
      return res.status(403).json({
        success: false,
        message: `Role "${participant.role}" is not eligible to receive a certificate.`,
      });
    }

    const pdfBuffer = await generateCertificate(participant);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DropOutHacks_Certificate_${participant.name.replace(/\s+/g, '_')}.pdf"`
    );
    res.setHeader('X-Cert-Name', encodeURIComponent(participant.name));
    res.setHeader('X-Cert-Team', encodeURIComponent(participant.team_name));
    res.setHeader('X-Cert-Role', encodeURIComponent(participant.role));

    return res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  checkEmail,
  generateCertificateFile,
};
