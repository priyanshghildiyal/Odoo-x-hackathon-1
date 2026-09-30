import {
  Router
} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  db
} from '../database/connection.js';
import {
  config
} from '../config/env.js';
import {
  authenticate
} from '../middleware/auth.js';

const router = Router();
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  organization: user.organization_name,
  organizationId: user.organization_id,
  role: user.role_name
});

router.post('/register', (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Enter a valid name and email. Password must be at least 12 characters.'
        }
      });
    }
    const create = db.transaction(() => {
      const user = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email, name, bcrypt.hashSync(password, 12));
      const organization = db.prepare('INSERT INTO organizations (name) VALUES (?)').run(`${name}'s organization`);
      const owner = db.prepare("SELECT id FROM roles WHERE name = 'Owner'").get();
      db.prepare('INSERT INTO memberships (user_id, organization_id, role_id) VALUES (?, ?, ?)').run(user.lastInsertRowid, organization.lastInsertRowid, owner.id);
      return {
        userId: Number(user.lastInsertRowid),
        orgId: Number(organization.lastInsertRowid)
      };
    });
    const created = create();
    const record = db.prepare(`SELECT u.id,u.name,u.email,o.name organization_name,o.id organization_id,r.name role_name FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id JOIN roles r ON r.id=m.role_id WHERE u.id=?`).get(created.userId);
    const token = jwt.sign({
      sub: record.id,
      email,
      org: created.orgId
    }, config.jwtSecret, {
      expiresIn: '8h',
      issuer: 'stockwise'
    });
    res.status(201).json({
      success: true,
      data: {
        user: safeUser(record),
        token
      }
    });
  } catch (error) {
    if (String(error.code).includes('UNIQUE')) return res.status(409).json({
      success: false,
      error: {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists.'
      }
    });
    next(error);
  }
});

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const record = db.prepare(`SELECT u.id,u.name,u.email,u.password_hash,o.name organization_name,o.id organization_id,r.name role_name FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id JOIN roles r ON r.id=m.role_id WHERE u.email=?`).get(email);
  if (!record || !bcrypt.compareSync(password, record.password_hash)) return res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.'
    }
  });
  const token = jwt.sign({
    sub: record.id,
    email: record.email,
    org: record.organization_id
  }, config.jwtSecret, {
    expiresIn: '8h',
    issuer: 'stockwise'
  });
  res.json({
    success: true,
    data: {
      user: safeUser(record),
      token
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  const record = db.prepare(`SELECT u.id,u.name,u.email,o.name organization_name,o.id organization_id,r.name role_name FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id JOIN roles r ON r.id=m.role_id WHERE u.id=? AND o.id=?`).get(req.user.id, req.user.organizationId);
  res.json({
    success: true,
    data: {
      user: safeUser(record)
    }
  });
});

export default router;
