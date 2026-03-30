const express = require('express');
const cors = require('cors');
const certificateRoutes = require('./routes/certificateRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    exposedHeaders: ['X-Cert-Name', 'X-Cert-Team', 'X-Cert-Role'],
  })
);
app.use(express.json());

app.use('/api', certificateRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DropOutHacks Certificate Generator API is running!' });
});

app.use(errorHandler);

module.exports = app;
