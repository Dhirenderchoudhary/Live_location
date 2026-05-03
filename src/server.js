import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { configureSocket } from './socket.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Mock OIDC/OAuth Login Endpoint
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  const userId = `usr_${Buffer.from(username).toString('base64').substring(0, 8)}`;
  const token = jwt.sign({ userId, username }, process.env.JWT_SECRET || 'super-secret-key', { expiresIn: '12h' });
  
  res.json({ token, userId, username });
});

// Catch-all route to serve the React app
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

configureSocket(io);

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    httpServer.listen(PORT, () => {
      console.log(`Backend Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
