import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import {
  fileURLToPath
} from 'node:url';
import {
  config
} from './config/env.js';
import './database/connection.js';
import './database/roles.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import assistantRoutes from './routes/assistant.js';
import {
  notFound,
  errorHandler
} from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false
}));
app.use(cors({
  origin: config.nodeEnv === 'production' ? config.clientUrl : [config.clientUrl, 'http://localhost:5173'],
  credentials: false
}));
app.use(compression());
app.use(express.json({
  limit: '1mb'
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.get('/api/health', (req, res) => res.json({
  success: true,
  status: 'ok'
}));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}), authRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', apiRoutes);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDist = path.join(projectRoot, 'client', 'dist');
if (config.nodeEnv === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    maxAge: '1y',
    index: false
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Stockwise API listening',
    port: config.port,
    environment: config.nodeEnv
  }));
});
