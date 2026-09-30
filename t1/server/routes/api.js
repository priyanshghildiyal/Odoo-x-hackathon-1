import {
  Router
} from 'express';
import {
  db
} from '../database/connection.js';
import {
  authenticate,
  requirePermission
} from '../middleware/auth.js';
import {
  writeAudit
} from '../services/audit.js';

const router = Router();
router.use(authenticate);
const org = (req) => req.user.organizationId;
const fail = (res, status, code, message) => res.status(status).json({
  success: false,
  error: {
    code,
    message
  }
});
const positive = (n) => Number.isFinite(Number(n)) && Number(n) > 0;
const hasPermission = (user, permission) => Boolean(db.prepare(`SELECT 1 FROM memberships m JOIN role_permissions rp ON rp.role_id=m.role_id JOIN permissions p ON p.id=rp.permission_id WHERE m.user_id=? AND m.organization_id=? AND p.key=?`).get(user.id, user.organizationId, permission));

router.get('/dashboard', (req, res) => {
  const organizationId = org(req);
  const summary = db.prepare(`SELECT COUNT(DISTINCT p.id) product_count,
    COALESCE(SUM(i.quantity*p.cost_price),0) inventory_value,
    SUM(CASE WHEN i.quantity=0 THEN 1 ELSE 0 END) out_of_stock,
    SUM(CASE WHEN i.quantity>0 AND i.quantity<=p.reorder_point THEN 1 ELSE 0 END) low_stock
    FROM products p LEFT JOIN inventory i ON i.product_id=p.id
    WHERE p.organization_id=? AND p.status='active'`).get(organizationId);
  const movements = db.prepare(`SELECT sm.id,sm.type,sm.quantity,sm.previous_quantity,sm.new_quantity,sm.reference,sm.reason,sm.created_at,p.name product_name,p.sku,w.name warehouse_name,u.name user_name
    FROM stock_movements sm JOIN products p ON p.id=sm.product_id JOIN warehouses w ON w.id=sm.warehouse_id JOIN users u ON u.id=sm.user_id
    WHERE sm.organization_id=? ORDER BY sm.id DESC LIMIT 8`).all(organizationId);
  const lowStock = db.prepare(`SELECT p.id,p.name,p.sku,p.reorder_point,COALESCE(SUM(i.quantity),0) quantity
    FROM products p LEFT JOIN inventory i ON i.product_id=p.id WHERE p.organization_id=? AND p.status='active'
    GROUP BY p.id HAVING quantity<=p.reorder_point ORDER BY quantity ASC LIMIT 6`).all(organizationId);
  const warehouses = db.prepare(`SELECT w.id,w.name,w.code,COUNT(DISTINCT i.product_id) products,COALESCE(SUM(i.quantity*p.cost_price),0) value
    FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id=w.id LEFT JOIN products p ON p.id=i.product_id
    WHERE w.organization_id=? AND w.status='active' GROUP BY w.id`).all(organizationId);
  res.json({
    success: true,
    data: {
      summary: {
        ...summary,
        out_of_stock: summary.out_of_stock || 0,
        low_stock: summary.low_stock || 0
      },
      movements,
      lowStock,
      warehouses
    }
  });
});

router.get('/products', requirePermission('products.read'), (req, res) => {
  const organizationId = org(req);
  const q = String(req.query.q || '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const filter = `%${q}%`;
  const where = `p.organization_id=? AND p.status=? AND (p.name LIKE ? OR p.sku LIKE ? OR COALESCE(c.name,'') LIKE ?)`;
  const rows = db.prepare(`SELECT p.id,p.sku,p.name,p.description,p.unit,p.cost_price,p.selling_price,p.reorder_point,p.reorder_quantity,p.status,p.created_at,c.name category_name,s.name supplier_name,COALESCE(SUM(i.quantity),0) quantity,COALESCE(SUM(i.reserved),0) reserved
    FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN inventory i ON i.product_id=p.id
    WHERE ${where} GROUP BY p.id ORDER BY p.name LIMIT ? OFFSET ?`).all(organizationId, req.query.status === 'archived' ? 'archived' : 'active', filter, filter, filter, limit, (page - 1) * limit);
  const total = db.prepare(`SELECT COUNT(*) total FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE ${where}`).get(organizationId, req.query.status === 'archived' ? 'archived' : 'active', filter, filter, filter).total;
  res.json({
    success: true,
    data: {
      items: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

router.post('/products', requirePermission('products.create'), (req, res, next) => {
  try {
    const {
      sku,
      name
    } = req.body;
    if (!String(sku || '').trim() || !String(name || '').trim()) return fail(res, 400, 'VALIDATION_ERROR', 'SKU and product name are required.');
    const cost = Number(req.body.cost_price || 0),
      price = Number(req.body.selling_price || 0),
      reorder = Number(req.body.reorder_point || 0);
    if ([cost, price, reorder].some((n) => !Number.isFinite(n) || n < 0)) return fail(res, 400, 'VALIDATION_ERROR', 'Prices and reorder point must be non-negative numbers.');
    const result = db.prepare(`INSERT INTO products (organization_id,sku,name,description,unit,cost_price,selling_price,reorder_point,reorder_quantity)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(org(req), String(sku).trim().slice(0, 80), String(name).trim().slice(0, 160), String(req.body.description || '').slice(0, 2000), String(req.body.unit || 'pcs').slice(0, 20), cost, price, reorder, Math.max(0, Number(req.body.reorder_quantity || 0)));
    writeAudit({
      organizationId: org(req),
      userId: req.user.id,
      action: 'created',
      entity: 'product',
      entityId: Number(result.lastInsertRowid),
      details: {
        sku,
        name
      }
    });
    res.status(201).json({
      success: true,
      data: {
        id: Number(result.lastInsertRowid)
      }
    });
  } catch (error) {
    if (String(error.code).includes('UNIQUE')) return fail(res, 409, 'SKU_EXISTS', 'That SKU is already in use.');
    next(error);
  }
});

router.patch('/products/:id', requirePermission('products.update'), (req, res, next) => {
  try {
    const id = Number(req.params.id),
      product = db.prepare('SELECT * FROM products WHERE id=? AND organization_id=?').get(id, org(req));
    if (!product) return fail(res, 404, 'NOT_FOUND', 'Product was not found.');
    const name = String(req.body.name ?? product.name).trim();
    const price = Number(req.body.selling_price ?? product.selling_price),
      cost = Number(req.body.cost_price ?? product.cost_price),
      reorder = Number(req.body.reorder_point ?? product.reorder_point);
    if (!name || [price, cost, reorder].some((n) => !Number.isFinite(n) || n < 0)) return fail(res, 400, 'VALIDATION_ERROR', 'Provide a valid name, price and reorder point.');
    db.prepare(`UPDATE products SET name=?,description=?,selling_price=?,cost_price=?,reorder_point=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?`).run(name, String(req.body.description ?? product.description).slice(0, 2000), price, cost, reorder, id, org(req));
    writeAudit({
      organizationId: org(req),
      userId: req.user.id,
      action: 'updated',
      entity: 'product',
      entityId: id
    });
    res.json({
      success: true,
      data: {
        id
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/products/:id', requirePermission('products.delete'), (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare('SELECT id FROM products WHERE id=? AND organization_id=?').get(id, org(req));
  if (!product) return fail(res, 404, 'NOT_FOUND', 'Product was not found.');
  db.prepare("UPDATE products SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?").run(id, org(req));
  writeAudit({
    organizationId: org(req),
    userId: req.user.id,
    action: 'archived',
    entity: 'product',
    entityId: id
  });
  res.json({
    success: true,
    data: {
      id
    }
  });
});

router.get('/warehouses', requirePermission('warehouse.read'), (req, res) => {
  const rows = db.prepare(`SELECT w.*,COUNT(DISTINCT i.product_id) product_count,COALESCE(SUM(i.quantity),0) units FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id=w.id WHERE w.organization_id=? GROUP BY w.id ORDER BY w.name`).all(org(req));
  res.json({
    success: true,
    data: {
      items: rows
    }
  });
});
router.post('/warehouses', requirePermission('warehouse.manage'), (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim(),
      code = String(req.body.code || '').trim().toUpperCase();
    if (!name || !code) return fail(res, 400, 'VALIDATION_ERROR', 'Warehouse name and code are required.');
    const result = db.prepare('INSERT INTO warehouses (organization_id,name,code,address) VALUES (?,?,?,?)').run(org(req), name.slice(0, 120), code.slice(0, 24), String(req.body.address || '').slice(0, 300));
    writeAudit({
      organizationId: org(req),
      userId: req.user.id,
      action: 'created',
      entity: 'warehouse',
      entityId: Number(result.lastInsertRowid)
    });
    res.status(201).json({
      success: true,
      data: {
        id: Number(result.lastInsertRowid)
      }
    });
  } catch (error) {
    if (String(error.code).includes('UNIQUE')) return fail(res, 409, 'CODE_EXISTS', 'That warehouse code is already in use.');
    next(error);
  }
});

router.get('/suppliers', (req, res) => {
  res.json({
    success: true,
    data: {
      items: db.prepare('SELECT id,name,email,phone,status,created_at FROM suppliers WHERE organization_id=? ORDER BY name').all(org(req))
    }
  });
});
router.post('/suppliers', requirePermission('purchases.create'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return fail(res, 400, 'VALIDATION_ERROR', 'Supplier name is required.');
  const result = db.prepare('INSERT INTO suppliers (organization_id,name,email,phone) VALUES (?,?,?,?)').run(org(req), name.slice(0, 160), String(req.body.email || '').slice(0, 160), String(req.body.phone || '').slice(0, 40));
  writeAudit({
    organizationId: org(req),
    userId: req.user.id,
    action: 'created',
    entity: 'supplier',
    entityId: Number(result.lastInsertRowid)
  });
  res.status(201).json({
    success: true,
    data: {
      id: Number(result.lastInsertRowid)
    }
  });
});

router.get('/inventory', requirePermission('inventory.read'), (req, res) => {
  const search = `%${String(req.query.q || '').trim().slice(0,100)}%`;
  const items = db.prepare(`SELECT i.product_id,i.warehouse_id,i.quantity,i.reserved,p.sku,p.name product_name,p.reorder_point,w.name warehouse_name,w.code warehouse_code
    FROM inventory i JOIN products p ON p.id=i.product_id JOIN warehouses w ON w.id=i.warehouse_id
    WHERE i.organization_id=? AND p.status='active' AND (p.name LIKE ? OR p.sku LIKE ? OR w.name LIKE ?) ORDER BY p.name,w.name`).all(org(req), search, search, search);
  res.json({
    success: true,
    data: {
      items
    }
  });
});

router.post('/inventory/movements', (req, res) => {
  const {
    type,
    product_id: productId,
    warehouse_id: warehouseId
  } = req.body;
  const quantity = Number(req.body.quantity);
  const allowed = ['receive', 'issue', 'adjustment', 'transfer'];
  const actionPermission = { receive: 'inventory.receive', issue: 'inventory.issue', adjustment: 'inventory.adjust', transfer: 'inventory.transfer' }[type];
  if (!actionPermission) return fail(res, 400, 'VALIDATION_ERROR', 'Choose a supported stock movement type.');
  if (!hasPermission(req.user, actionPermission)) return fail(res, 403, 'FORBIDDEN', 'You do not have permission to perform this stock movement.');
  if (!allowed.includes(type) || !positive(quantity) || !Number.isSafeInteger(Number(productId)) || !Number.isSafeInteger(Number(warehouseId))) return fail(res, 400, 'VALIDATION_ERROR', 'Choose a movement type, product, warehouse and a quantity greater than zero.');
  if (type === 'adjustment' && String(req.body.reason || '').trim().length < 3) return fail(res, 400, 'REASON_REQUIRED', 'A clear adjustment reason is required.');
  const transaction = db.transaction(() => {
    const p = db.prepare('SELECT id FROM products WHERE id=? AND organization_id=? AND status=\'active\'').get(productId, org(req));
    const w = db.prepare("SELECT id FROM warehouses WHERE id=? AND organization_id=? AND status='active'").get(warehouseId, org(req));
    if (!p || !w) throw Object.assign(new Error('Product or warehouse was not found in this organization.'), {
      status: 404,
      code: 'NOT_FOUND'
    });
    let stock = db.prepare('SELECT quantity,reserved FROM inventory WHERE product_id=? AND warehouse_id=? AND organization_id=?').get(productId, warehouseId, org(req));
    if (!stock) {
      db.prepare('INSERT INTO inventory (organization_id,product_id,warehouse_id,quantity) VALUES (?,?,?,0)').run(org(req), productId, warehouseId);
      stock = {
        quantity: 0,
        reserved: 0
      };
    }
    let delta = type === 'receive' ? quantity : -quantity;
    if (type === 'adjustment') delta = Number(req.body.direction) < 0 ? -quantity : quantity;
    if (type === 'transfer') {
      const destination = Number(req.body.destination_warehouse_id);
      if (!Number.isSafeInteger(destination) || destination === Number(warehouseId) || !db.prepare("SELECT id FROM warehouses WHERE id=? AND organization_id=? AND status='active'").get(destination, org(req))) throw Object.assign(new Error('Choose a different destination warehouse in this organization.'), {
        status: 400,
        code: 'INVALID_DESTINATION'
      });
      if (stock.quantity - quantity < stock.reserved) throw Object.assign(new Error('Transfer exceeds available stock.'), {
        status: 409,
        code: 'INSUFFICIENT_STOCK'
      });
      const ref = `TR-${Date.now()}`;
      db.prepare('UPDATE inventory SET quantity=quantity-? WHERE product_id=? AND warehouse_id=? AND organization_id=?').run(quantity, productId, warehouseId, org(req));
      db.prepare('INSERT INTO stock_movements (organization_id,product_id,warehouse_id,user_id,type,quantity,previous_quantity,new_quantity,reference,reason) VALUES (?,?,?,?,?,?,?,?,?,?)').run(org(req), productId, warehouseId, req.user.id, 'transfer_out', quantity, stock.quantity, stock.quantity - quantity, ref, 'Transfer dispatched');
      const target = db.prepare('SELECT quantity FROM inventory WHERE product_id=? AND warehouse_id=? AND organization_id=?').get(productId, destination, org(req));
      const previous = target?.quantity ?? 0;
      if (target) db.prepare('UPDATE inventory SET quantity=quantity+? WHERE product_id=? AND warehouse_id=? AND organization_id=?').run(quantity, productId, destination, org(req));
      else db.prepare('INSERT INTO inventory (organization_id,product_id,warehouse_id,quantity) VALUES (?,?,?,?)').run(org(req), productId, destination, quantity);
      db.prepare('INSERT INTO stock_movements (organization_id,product_id,warehouse_id,user_id,type,quantity,previous_quantity,new_quantity,reference,reason) VALUES (?,?,?,?,?,?,?,?,?,?)').run(org(req), productId, destination, req.user.id, 'transfer_in', quantity, previous, previous + quantity, ref, 'Transfer received');
      writeAudit({
        organizationId: org(req),
        userId: req.user.id,
        action: 'transferred',
        entity: 'product',
        entityId: Number(productId),
        details: {
          quantity,
          from: Number(warehouseId),
          to: destination,
          reference: ref
        }
      });
      return {
        reference: ref,
        quantity
      };
    }
    const next = stock.quantity + delta;
    if (next < stock.reserved || next < 0) throw Object.assign(new Error('This movement would make available stock negative.'), {
      status: 409,
      code: 'INSUFFICIENT_STOCK'
    });
    db.prepare('UPDATE inventory SET quantity=? WHERE product_id=? AND warehouse_id=? AND organization_id=?').run(next, productId, warehouseId, org(req));
    const movementType = type === 'adjustment' ? 'adjustment' : type;
    const reason = String(req.body.reason || '').trim().slice(0, 240);
    const ref = String(req.body.reference || '').trim().slice(0, 80);
    const movement = db.prepare('INSERT INTO stock_movements (organization_id,product_id,warehouse_id,user_id,type,quantity,previous_quantity,new_quantity,reference,reason) VALUES (?,?,?,?,?,?,?,?,?,?)').run(org(req), productId, warehouseId, req.user.id, movementType, quantity, stock.quantity, next, ref, reason);
    writeAudit({
      organizationId: org(req),
      userId: req.user.id,
      action: type,
      entity: 'stock_movement',
      entityId: Number(movement.lastInsertRowid),
      details: {
        productId: Number(productId),
        quantity,
        previous: stock.quantity,
        next,
        reason
      }
    });
    return {
      id: Number(movement.lastInsertRowid),
      previous: stock.quantity,
      current: next
    };
  });
  try {
    res.status(201).json({
      success: true,
      data: transaction()
    });
  } catch (error) {
    fail(res, error.status || 400, error.code || 'MOVEMENT_FAILED', error.message || 'Unable to apply stock movement.');
  }
});

router.get('/inventory/movements', requirePermission('inventory.read'), (req, res) => {
  const items = db.prepare(`SELECT sm.id,sm.type,sm.quantity,sm.previous_quantity,sm.new_quantity,sm.reference,sm.reason,sm.created_at,p.name product_name,p.sku,w.name warehouse_name,u.name user_name
    FROM stock_movements sm JOIN products p ON p.id=sm.product_id JOIN warehouses w ON w.id=sm.warehouse_id JOIN users u ON u.id=sm.user_id
    WHERE sm.organization_id=? ORDER BY sm.id DESC LIMIT 200`).all(org(req));
  res.json({
    success: true,
    data: {
      items
    }
  });
});

router.get('/reports/inventory', requirePermission('reports.read'), (req, res) => {
  const items = db.prepare(`SELECT p.sku,p.name product_name,w.name warehouse_name,i.quantity,i.reserved,(i.quantity*p.cost_price) stock_value,p.reorder_point,CASE WHEN i.quantity=0 THEN 'Out of stock' WHEN i.quantity<=p.reorder_point THEN 'Low' ELSE 'Healthy' END status
    FROM inventory i JOIN products p ON p.id=i.product_id JOIN warehouses w ON w.id=i.warehouse_id WHERE i.organization_id=? ORDER BY p.name`).all(org(req));
  res.json({
    success: true,
    data: {
      items
    }
  });
});
router.get('/notifications', (req, res) => {
  const items = db.prepare('SELECT id,title,message,type,read_at,created_at FROM notifications WHERE organization_id=? ORDER BY id DESC LIMIT 100').all(org(req));
  res.json({
    success: true,
    data: {
      items
    }
  });
});
router.patch('/notifications/:id/read', (req, res) => {
  const result = db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?').run(Number(req.params.id), org(req));
  if (!result.changes) return fail(res, 404, 'NOT_FOUND', 'Notification was not found.');
  res.json({
    success: true,
    data: {
      id: Number(req.params.id)
    }
  });
});
router.get('/audit-logs', requirePermission('reports.read'), (req, res) => {
  const items = db.prepare(`SELECT a.id,a.action,a.entity,a.entity_id,a.details,a.created_at,u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.organization_id=? ORDER BY a.id DESC LIMIT 200`).all(org(req));
  res.json({
    success: true,
    data: {
      items
    }
  });
});
router.get('/search', (req, res) => {
  const q = `%${String(req.query.q || '').trim().slice(0,80)}%`;
  const organizationId = org(req);
  const products = db.prepare('SELECT id,name title,sku subtitle,\'product\' type FROM products WHERE organization_id=? AND status=\'active\' AND (name LIKE ? OR sku LIKE ?) LIMIT 8').all(organizationId, q, q);
  const warehouses = db.prepare('SELECT id,name title,code subtitle,\'warehouse\' type FROM warehouses WHERE organization_id=? AND name LIKE ? LIMIT 5').all(organizationId, q);
  const suppliers = db.prepare("SELECT id,name title,COALESCE(email,'Supplier') subtitle,'supplier' type FROM suppliers WHERE organization_id=? AND name LIKE ? LIMIT 5").all(organizationId, q);
  res.json({
    success: true,
    data: {
      items: [...products, ...warehouses, ...suppliers]
    }
  });
});

export default router;
