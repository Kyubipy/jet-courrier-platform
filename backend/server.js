const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io para tracking en tiempo real
io.on('connection', (socket) => {
  console.log('👤 Usuario conectado:', socket.id);
  
  // Delivery se conecta y envía su ubicación
  socket.on('delivery_location_update', (data) => {
    // Reenviar ubicación a cliente que está trackeando
    socket.to(`order_${data.order_id}`).emit('delivery_location', data);
  });
  
  // Cliente se suscribe a tracking de pedido
  socket.on('track_order', (order_id) => {
    socket.join(`order_${order_id}`);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Usuario desconectado:', socket.id);
  });
});

// Hacer io disponible para las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    message: '🏍️🧠 UBER DE DELIVERYS API - Paraguay',
    version: '1.0.0',
    status: 'El Cerebro está funcionando',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      deliverys: '/api/deliverys/*', 
      clients: '/api/clients/*',
      orders: '/api/orders/*',
      matching: '/api/matching/*'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: '✅ Sistema funcionando', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cerebro_status: 'ACTIVO'
  });
});

// Importar rutas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/deliverys', require('./src/routes/deliverys'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/matching', require('./src/routes/matching'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
    available_routes: ['/api/auth', '/api/deliverys', '/api/clients', '/api/orders', '/api/matching']
  });
});

server.listen(PORT, () => {
  console.log(`🚀 UBER DE DELIVERYS API corriendo en puerto ${PORT}`);
  console.log(`🧠 El Cerebro está ACTIVO y listo para asignar deliverys`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});