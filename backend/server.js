const express = require('express');
const cors = require('cors');
const path = require('path');
const certificateRoutes = require('./routes/certificate');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  exposedHeaders: ['X-Cert-Name', 'X-Cert-Team', 'X-Cert-Role'],
}));
app.use(express.json());

// Routes
app.use('/api', certificateRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'DropOutHacks Certificate Generator API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
