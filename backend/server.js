const path = require('path');
const express = require('express');
const cors = require('cors');
const { verifyToken } = require('./utils/security');

// Database
const DatabaseManager = require('./database');

// Services
const AuthService = require('./services/AuthService');
const ClientService = require('./services/ClientService');
const TechnicianService = require('./services/TechnicianService');
const OrderService = require('./services/OrderService');
const ServiceRequestService = require('./services/ServiceRequestService');
const EmailService = require('./services/EmailService');
const ReportService = require('./services/ReportService');

// Controllers
const AuthController = require('./controllers/AuthController');
const ClientController = require('./controllers/ClientController');
const TechnicianController = require('./controllers/TechnicianController');
const OrderController = require('./controllers/OrderController');
const ServiceRequestController = require('./controllers/ServiceRequestController');
const ReportController = require('./controllers/ReportController');

// Initialize
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || null;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'rjvidros.db');
const db = new DatabaseManager(DB_PATH);

// Services instances
const authService = new AuthService(db);
const clientService = new ClientService(db);
const technicianService = new TechnicianService(db);
const emailService = new EmailService();
const orderService = new OrderService(db, emailService);
const serviceRequestService = new ServiceRequestService(db);
const reportService = new ReportService(db);

// Controllers instances
const authController = new AuthController(authService);
const clientController = new ClientController(clientService);
const technicianController = new TechnicianController(technicianService);
const orderController = new OrderController(orderService);
const serviceRequestController = new ServiceRequestController(serviceRequestService);
const reportController = new ReportController(reportService);

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN;
const frontendRoot = path.resolve(__dirname, '..', 'frontend');
app.disable('x-powered-by');
app.use(cors({
  origin: allowedOrigin ? allowedOrigin.split(',').map(origin => origin.trim()) : process.env.NODE_ENV === 'production' ? false : true
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.static(frontendRoot));

const requireAuth = (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Autenticacao obrigatoria' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Sessao invalida ou expirada' });
  }

  req.user = user;
  next();
};

const serviceRequestRateLimit = (() => {
  const attempts = new Map();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = attempts.get(key) || [];
    const recent = current.filter(timestamp => now - timestamp < windowMs);

    if (recent.length >= maxAttempts) {
      return res.status(429).json({ error: 'Muitas solicitacoes em pouco tempo. Tente novamente em alguns minutos.' });
    }

    recent.push(now);
    attempts.set(key, recent);
    next();
  };
})();

const loginRateLimit = (() => {
  const attempts = new Map();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;

  return (req, res, next) => {
    const key = `${req.ip || req.socket.remoteAddress || 'unknown'}:${String(req.body?.email || '').toLowerCase()}`;
    const now = Date.now();
    const current = attempts.get(key) || [];
    const recent = current.filter(timestamp => now - timestamp < windowMs);

    if (recent.length >= maxAttempts) {
      return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
    }

    recent.push(now);
    attempts.set(key, recent);
    next();
  };
})();

// Health check for web hosting platforms
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'RJvidros OS',
    version: '1.0.0'
  });
});

app.get('/api/config/public', (req, res) => {
  res.json({
    whatsappCentralNumber: process.env.WHATSAPP_CENTRAL_NUMBER || '5511999999999',
    whatsappCentralName: process.env.WHATSAPP_CENTRAL_NAME || 'Central RJvidros'
  });
});

// Routes - Auth
app.post('/api/auth/login', loginRateLimit, (req, res) => authController.login(req, res));

// Public service request routes
app.get('/api/solicitacoes/tipos', (req, res) => serviceRequestController.getServiceTypes(req, res));
app.post('/api/solicitacoes', serviceRequestRateLimit, (req, res) => serviceRequestController.create(req, res));

// Protected API routes
app.use('/api', requireAuth);

// Routes - Clients
app.get('/api/clientes', (req, res) => clientController.getAll(req, res));
app.post('/api/clientes', (req, res) => clientController.create(req, res));

// Routes - Technicians
app.get('/api/tecnicos', (req, res) => technicianController.getAll(req, res));
app.get('/api/tecnicos/ativos', (req, res) => technicianController.getActive(req, res));
app.post('/api/tecnicos', (req, res) => technicianController.create(req, res));

// Routes - Orders
app.get('/api/ordens', (req, res) => orderController.getAll(req, res));
app.get('/api/ordens/abertas', (req, res) => orderController.getOpen(req, res));
app.get('/api/ordens/concluidas', (req, res) => orderController.getClosed(req, res));
app.get('/api/ordens/:id', (req, res) => orderController.getById(req, res));
app.post('/api/ordens', (req, res) => orderController.create(req, res));
app.put('/api/ordens/:id/finalizar-pago', (req, res) => orderController.finalizeAsPaid(req, res));

// Routes - Service Requests (Public)
app.get('/api/solicitacoes', (req, res) => serviceRequestController.getAll(req, res));
app.get('/api/solicitacoes/pendentes', (req, res) => serviceRequestController.getPending(req, res));
app.get('/api/solicitacoes/:id', (req, res) => serviceRequestController.getById(req, res));
app.put('/api/solicitacoes/:id/status', (req, res) => serviceRequestController.updateStatus(req, res));
app.post('/api/solicitacoes/:id/gerar-os', (req, res) => serviceRequestController.convertToOrder(req, res));

// Routes - Finance and Reports
app.get('/api/financeiro/resumo', (req, res) => reportController.getFinanceSummary(req, res));
app.get('/api/relatorios/financeiro', (req, res) => reportController.getFinanceReport(req, res));
app.get('/api/relatorios/clientes', (req, res) => reportController.getClientReport(req, res));
app.get('/api/relatorios/tecnicos', (req, res) => reportController.getTechnicianReport(req, res));

// Dashboard metrics
app.get('/api/dashboard', async (req, res) => {
  try {
    const metrics = await db.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Não foi possível carregar o dashboard.' });
  }
});

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'index.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }

  const filePath = path.resolve(frontendRoot, `.${req.path}`);
  if (!filePath.startsWith(`${frontendRoot}${path.sep}`) && filePath !== frontendRoot) {
    return res.status(403).send('Acesso negado');
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(frontendRoot, 'login.html'));
    }
  });
});

const listenArgs = HOST ? [PORT, HOST] : [PORT];
const server = app.listen(...listenArgs, () => {
  console.log('RJvidros OS Backend v1.0');
  console.log(`Rodando em http://${HOST || 'localhost'}:${PORT}`);
  console.log(`Banco SQLite: ${DB_PATH}`);
  console.log('Painel administrativo pronto');
});

const shutdown = async () => {
  console.log('Encerrando RJvidros OS...');
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
