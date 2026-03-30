const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

const PARTICIPANTS_CSV_PATH = path.join(DATA_DIR, 'participants.csv');
const TEMPLATE_CONFIG_PATH = path.join(TEMPLATES_DIR, 'config.json');

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  TEMPLATES_DIR,
  OUTPUT_DIR,
  PARTICIPANTS_CSV_PATH,
  TEMPLATE_CONFIG_PATH,
};
