const express = require('express');
const { query } = require('../../database/connection');

const router = express.Router();

// Crear nuevo pedido
router.post('/create', async (req, res) => {
  try {
    const {
      client_id,
      pickup_address,
      delivery_address,
      pickup_lat,
      pickup_lng,
      delivery_lat,
      delivery_lng,
      description,
      package_type
    } = req.body;

    // Calcular precios
    const estimatedDistance = 5; // Por ahora fijo, después usar Google Maps
    const basePrice = 10000;
    const pricePerKm = 2000;
    const deliveryFee = 5000;
    const totalPrice = basePrice + (estimatedDistance * pricePerKm) + deliveryFee;
    const platformCommission = totalPrice * 0.20;
    const deliveryPayment = totalPrice - platformCommission;

    // Crear pedido
    const result = await query(`
      INSERT INTO orders (
        client_id, pickup_address, delivery_address,
        pickup_lat, pickup_lng, delivery_lat, delivery_lng,
        description, package_type, estimated_distance,
        base_price, delivery_fee, total_price, 
        platform_commission, delivery_payment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      client_id, pickup_address, delivery_address,
      pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      description, package_type, estimatedDistance,
      basePrice, deliveryFee, totalPrice,
      platformCommission, deliveryPayment
    ]);

    const newOrder = result.rows[0];

    // TODO: Aquí activar el algoritmo de matching
    console.log('🧠 Activando algoritmo de matching para pedido:', newOrder.id);

    res.status(201).json({
      message: '📦 Pedido creado exitosamente',
      order: newOrder,
      next_step: 'El sistema está buscando el mejor delivery para tu pedido'
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Error creando pedido' });
  }
});

// Ver pedidos del cliente
router.get('/client/:client_id', async (req, res) => {
  try {
    const { client_id } = req.params;
    
    const result = await query(`
      SELECT o.*, u.full_name as delivery_name, u.phone as delivery_phone
      FROM orders o
      LEFT JOIN users u ON o.delivery_id = u.id
      WHERE o.client_id = $1
      ORDER BY o.created_at DESC
    `, [client_id]);

    res.json({
      message: '📋 Historial de pedidos',
      orders: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

module.exports = router;