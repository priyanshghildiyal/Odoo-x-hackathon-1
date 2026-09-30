import {
  db
} from '../database/connection.js';

export function writeAudit({
  organizationId,
  userId,
  action,
  entity,
  entityId = null,
  details = {}
}) {
  db.prepare('INSERT INTO audit_logs (organization_id,user_id,action,entity,entity_id,details) VALUES (?,?,?,?,?,?)')
    .run(organizationId, userId, action, entity, entityId, JSON.stringify(details));
}
