const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/drives', require('./routes/drives'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/synopsis', require('./routes/synopsis'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/checkpoints', require('./routes/checkpoints'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Socket.io initialized and ready for real-time updates`);
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = { app, io };
