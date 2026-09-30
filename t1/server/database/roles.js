import { db } from './connection.js';

const roles = ['Owner', 'Admin', 'Inventory Manager', 'Warehouse Manager', 'Procurement', 'Finance', 'Sales', 'Staff', 'Viewer'];
const permissions = ['products.read', 'products.create', 'products.update', 'products.delete', 'inventory.read', 'inventory.receive', 'inventory.issue', 'inventory.transfer', 'inventory.adjust', 'warehouse.read', 'warehouse.manage', 'purchases.read', 'purchases.create', 'purchases.approve', 'sales.read', 'sales.create', 'invoice.read', 'invoice.create', 'reports.read', 'users.manage', 'settings.manage'];
const grants = {
  Owner: permissions,
  Admin: permissions,
  'Inventory Manager': ['products.read', 'products.create', 'products.update', 'inventory.read', 'inventory.receive', 'inventory.issue', 'inventory.transfer', 'inventory.adjust', 'warehouse.read', 'reports.read'],
  'Warehouse Manager': ['products.read', 'inventory.read', 'inventory.receive', 'inventory.issue', 'inventory.transfer', 'inventory.adjust', 'warehouse.read', 'warehouse.manage'],
  Procurement: ['products.read', 'inventory.read', 'warehouse.read', 'purchases.read', 'purchases.create', 'purchases.approve'],
  Finance: ['products.read', 'reports.read', 'invoice.read', 'invoice.create'],
  Sales: ['products.read', 'inventory.read', 'sales.read', 'sales.create', 'invoice.read', 'invoice.create'],
  Staff: ['products.read', 'inventory.read', 'warehouse.read'],
  Viewer: ['products.read', 'inventory.read', 'warehouse.read', 'purchases.read', 'sales.read', 'invoice.read', 'reports.read']
};

const initializeRoles = db.transaction(() => {
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name) VALUES (?)');
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions (key) VALUES (?)');
  const insertGrant = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  const roleId = db.prepare('SELECT id FROM roles WHERE name = ?');
  const permissionId = db.prepare('SELECT id FROM permissions WHERE key = ?');

  for (const role of roles) insertRole.run(role);
  for (const permission of permissions) insertPermission.run(permission);
  for (const [role, grantedPermissions] of Object.entries(grants)) {
    for (const permission of grantedPermissions) {
      insertGrant.run(roleId.get(role).id, permissionId.get(permission).id);
    }
  }
});

initializeRoles();