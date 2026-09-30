import jwt from 'jsonwebtoken';
import {
  config
} from '../config/env.js';
import {
  db
} from '../database/connection.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Please sign in to continue.'
    }
  });
  try {
    const claims = jwt.verify(token, config.jwtSecret);
    const membership = db.prepare(`SELECT m.organization_id, m.role_id, r.name AS role_name
      FROM memberships m JOIN roles r ON r.id = m.role_id WHERE m.user_id = ? AND m.organization_id = ?`)
      .get(claims.sub, claims.org);
    if (!membership) return res.status(403).json({
      success: false,
      error: {
        code: 'MEMBERSHIP_REQUIRED',
        message: 'Organization access is unavailable.'
      }
    });
    req.user = {
      id: Number(claims.sub),
      email: claims.email,
      organizationId: membership.organization_id,
      roleId: membership.role_id,
      role: membership.role_name
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired. Please sign in again.'
      }
    });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const allowed = db.prepare(`SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.user_id = ? AND m.organization_id = ? AND p.key = ?`)
      .get(req.user.id, req.user.organizationId, permission);
    if (!allowed) return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.'
      }
    });
    next();
  };
}
