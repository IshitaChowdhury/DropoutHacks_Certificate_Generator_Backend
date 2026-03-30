const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const { PARTICIPANTS_CSV_PATH } = require('../utils/fileHelper');

function readParticipants() {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(PARTICIPANTS_CSV_PATH)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function findParticipantByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await readParticipants();

  return (
    rows.find((row) => row.email.trim().toLowerCase() === normalizedEmail) ||
    null
  );
}

async function markAsUsed(email) {
  const participants = await readParticipants();
  const normalizedEmail = email.trim().toLowerCase();

  const updated = participants.map((participant) => {
    if (participant.email.trim().toLowerCase() === normalizedEmail) {
      return { ...participant, used: 'true' };
    }
    return participant;
  });

  const writer = createObjectCsvWriter({
    path: PARTICIPANTS_CSV_PATH,
    header: [
      { id: 'email', title: 'email' },
      { id: 'name', title: 'name' },
      { id: 'team_name', title: 'team_name' },
      { id: 'role', title: 'role' },
      { id: 'used', title: 'used' },
    ],
  });

  await writer.writeRecords(updated);
}

module.exports = {
  readParticipants,
  findParticipantByEmail,
  markAsUsed,
};
