const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const CSV_PATH = path.join(__dirname, '../participants.csv');

// Read all participants from CSV
function readParticipants() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Find a participant by email
async function findByEmail(email) {
  const participants = await readParticipants();
  return (
    participants.find(
      (p) => p.email.trim().toLowerCase() === email.trim().toLowerCase()
    ) || null
  );
}

// Mark a participant's certificate as used (downloaded)
async function markAsUsed(email) {
  const participants = await readParticipants();
  const updated = participants.map((p) => {
    if (p.email.trim().toLowerCase() === email.trim().toLowerCase()) {
      return { ...p, used: 'true' };
    }
    return p;
  });

  const writer = createObjectCsvWriter({
    path: CSV_PATH,
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

module.exports = { findByEmail, markAsUsed };
