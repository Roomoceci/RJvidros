const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { hashPassword } = require('./utils/security');

class DatabaseManager {
  constructor(dbPath = 'database/rjvidros.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.init();
  }

  init() {
    const dbFolder = path.dirname(this.dbPath);
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath);
    this.createSchema();
    this.seedData();
  }

  createSchema() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE,
        specialty TEXT,
        status TEXT DEFAULT 'Ativo',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        technician_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        total REAL DEFAULT 0,
        paid INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Aberta',
        completed_at DATETIME,
        nfe_email_sent_at DATETIME,
        nfe_email_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(technician_id) REFERENCES technicians(id)
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT NOT NULL,
        service_type TEXT NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        preferred_date TEXT,
        notes TEXT,
        status TEXT DEFAULT 'Pendente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.ensureOrderColumns();
    });
  }

  ensureOrderColumns() {
    this.db.all('PRAGMA table_info(orders)', (err, columns) => {
      if (err) return;

      const columnNames = columns.map(column => column.name);
      const migrations = [
        ['completed_at', 'ALTER TABLE orders ADD COLUMN completed_at DATETIME'],
        ['nfe_email_sent_at', 'ALTER TABLE orders ADD COLUMN nfe_email_sent_at DATETIME'],
        ['nfe_email_status', 'ALTER TABLE orders ADD COLUMN nfe_email_status TEXT']
      ];

      migrations.forEach(([columnName, sql]) => {
        if (!columnNames.includes(columnName)) {
          this.db.run(sql);
        }
      });
    });
  }

  seedData() {
    this.db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
      if (!err && row.count === 0) {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@rjvidros.com.br').trim().toLowerCase();
        const adminPassword = hashPassword(process.env.ADMIN_PASSWORD || 'admin123');
        const adminName = (process.env.ADMIN_NAME || 'Administrador').trim();

        this.db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
          [adminEmail, adminPassword, adminName]);

        if (String(process.env.SEED_DEMO_DATA || '').toLowerCase() !== 'true') {
          return;
        }

        this.db.run('INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
          ['Cliente Demo', '11999999999', 'cliente@example.com', 'Rua Exemplo, 123', 'Cliente padrão']);
        this.db.run('INSERT INTO technicians (name, phone, email, specialty, status) VALUES (?, ?, ?, ?, ?)',
          ['Técnico Demo', '11988888888', 'tecnico@example.com', 'Vidraçaria geral', 'Ativo']);
      }
    });
  }

  queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  queryGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }

  getUserByEmail(email) {
    return this.queryGet('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [String(email || '').trim()]);
  }

  updateUserPassword(id, passwordHash) {
    return this.run('UPDATE users SET password = ? WHERE id = ?', [passwordHash, id]);
  }

  getClients() {
    return this.queryAll('SELECT * FROM clients ORDER BY name');
  }

  getClientByEmail(email) {
    return this.queryGet('SELECT * FROM clients WHERE LOWER(email) = LOWER(?)', [String(email || '').trim()]);
  }

  createClient(client) {
    return this.run('INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [client.name, client.phone || null, client.email || null, client.address || null, client.notes || null]);
  }

  getTechnicians() {
    return this.queryAll('SELECT * FROM technicians ORDER BY name');
  }

  createTechnician(tech) {
    return this.run('INSERT INTO technicians (name, phone, email, specialty, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [tech.name, tech.phone || null, tech.email || null, tech.specialty || null, tech.status || 'Ativo', tech.notes || null]);
  }

  getOrders() {
    return this.queryAll(`SELECT o.*, c.name AS client, c.email AS client_email, c.phone AS client_phone, t.name AS technician
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN technicians t ON o.technician_id = t.id
      ORDER BY o.created_at DESC`);
  }

  getOrderById(id) {
    return this.queryGet(`SELECT o.*, c.name AS client, c.email AS client_email, c.phone AS client_phone, t.name AS technician
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN technicians t ON o.technician_id = t.id
      WHERE o.id = ?`, [id]);
  }

  createOrder(order) {
    return this.run('INSERT INTO orders (client_id, technician_id, title, description, total, paid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [order.client_id, order.technician_id || null, order.title, order.description || null, order.total || 0, order.paid ? 1 : 0, order.status || 'Aberta', order.created_at || new Date().toISOString()]);
  }

  async finalizeOrderAsPaid(id, emailStatus = null) {
    const completedAt = new Date().toISOString();
    await this.run(`UPDATE orders
      SET status = ?, paid = 1, completed_at = ?, nfe_email_status = ?
      WHERE id = ?`, ['Concluída', completedAt, emailStatus, id]);
    return this.getOrderById(id);
  }

  async markOrderNfeEmailSent(id) {
    const sentAt = new Date().toISOString();
    await this.run('UPDATE orders SET nfe_email_sent_at = ?, nfe_email_status = ? WHERE id = ?', [sentAt, 'Enviada', id]);
    return this.getOrderById(id);
  }

  async markOrderNfeEmailPending(id, reason) {
    await this.run('UPDATE orders SET nfe_email_status = ? WHERE id = ?', [`Pendente: ${reason}`, id]);
    return this.getOrderById(id);
  }

  async getDashboardMetrics() {
    const openOrders = await this.queryGet('SELECT COUNT(*) AS count FROM orders WHERE status = "Aberta"');
    const closedOrders = await this.queryGet('SELECT COUNT(*) AS count FROM orders WHERE status = "Concluída"');
    const revenue = await this.queryGet('SELECT IFNULL(SUM(total), 0) AS total FROM orders WHERE paid = 1');
    const activeClients = await this.queryGet('SELECT COUNT(*) AS count FROM clients');

    return {
      ordersOpen: openOrders?.count || 0,
      ordersClosed: closedOrders?.count || 0,
      revenue: revenue?.total || 0,
      activeClients: activeClients?.count || 0
    };
  }

  async getFinanceSummary() {
    const today = await this.queryGet(`SELECT IFNULL(SUM(total), 0) AS total
      FROM orders
      WHERE paid = 1 AND DATE(COALESCE(completed_at, created_at)) = DATE('now', 'localtime')`);

    const month = await this.queryGet(`SELECT IFNULL(SUM(total), 0) AS total
      FROM orders
      WHERE paid = 1
        AND strftime('%Y-%m', COALESCE(completed_at, created_at)) = strftime('%Y-%m', 'now', 'localtime')`);

    const paidOrders = await this.queryGet('SELECT COUNT(*) AS count FROM orders WHERE paid = 1');
    const pendingOrders = await this.queryGet('SELECT COUNT(*) AS count FROM orders WHERE paid = 0');
    const pendingAmount = await this.queryGet('SELECT IFNULL(SUM(total), 0) AS total FROM orders WHERE paid = 0');
    const totalRevenue = await this.queryGet('SELECT IFNULL(SUM(total), 0) AS total FROM orders WHERE paid = 1');
    const averageTicket = await this.queryGet('SELECT IFNULL(AVG(total), 0) AS total FROM orders WHERE paid = 1');

    return {
      dailyRevenue: today?.total || 0,
      monthlyRevenue: month?.total || 0,
      paidOrders: paidOrders?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      pendingAmount: pendingAmount?.total || 0,
      totalRevenue: totalRevenue?.total || 0,
      averageTicket: averageTicket?.total || 0
    };
  }

  getFinanceReport() {
    return this.queryAll(`SELECT
        status,
        paid,
        COUNT(*) AS orders,
        IFNULL(SUM(total), 0) AS total
      FROM orders
      GROUP BY status, paid
      ORDER BY status, paid DESC`);
  }

  getMonthlyRevenueReport() {
    return this.queryAll(`SELECT
        strftime('%Y-%m', COALESCE(completed_at, created_at)) AS month,
        COUNT(*) AS orders,
        IFNULL(SUM(CASE WHEN paid = 1 THEN total ELSE 0 END), 0) AS paidRevenue,
        IFNULL(SUM(CASE WHEN paid = 0 THEN total ELSE 0 END), 0) AS pendingRevenue
      FROM orders
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12`);
  }

  getClientReport() {
    return this.queryAll(`SELECT
        c.id,
        c.name,
        c.phone,
        c.email,
        COUNT(o.id) AS orders,
        IFNULL(SUM(o.total), 0) AS total,
        IFNULL(SUM(CASE WHEN o.paid = 1 THEN o.total ELSE 0 END), 0) AS paidTotal,
        MAX(o.created_at) AS lastOrderAt
      FROM clients c
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.id
      ORDER BY total DESC, c.name`);
  }

  getTechnicianReport() {
    return this.queryAll(`SELECT
        t.id,
        t.name,
        t.specialty,
        t.status,
        COUNT(o.id) AS orders,
        IFNULL(SUM(o.total), 0) AS total,
        IFNULL(SUM(CASE WHEN o.status LIKE 'Conclu%' THEN 1 ELSE 0 END), 0) AS closedOrders
      FROM technicians t
      LEFT JOIN orders o ON t.id = o.technician_id
      GROUP BY t.id
      ORDER BY orders DESC, t.name`);
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = DatabaseManager;
