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

// Ver pedido específico con detalles completos
router.get('/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const result = await query(`
      SELECT o.*, 
             u.full_name as delivery_name, 
             u.phone as delivery_phone,
             c.full_name as client_name,
             c.phone as client_phone
      FROM orders o
      LEFT JOIN users u ON o.delivery_id = u.id AND u.role = 'delivery'
      LEFT JOIN users c ON o.client_id = c.id AND c.role = 'client'
      WHERE o.id = $1
    `, [order_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json({
      message: '📄 Detalles del pedido',
      order: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ error: 'Error obteniendo pedido' });
  }
});

// Actualizar estado del pedido
router.patch('/:order_id/status', async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    
    // Validar estados permitidos
    const validStatuses = ['pending', 'matching', 'accepted', 'picking_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    // Determinar qué timestamp actualizar según el estado
    let timestampUpdate = '';
    if (status === 'accepted') timestampUpdate = ', accepted_at = CURRENT_TIMESTAMP';
    if (status === 'picking_up') timestampUpdate = ', picked_up_at = CURRENT_TIMESTAMP';
    if (status === 'delivered') timestampUpdate = ', delivered_at = CURRENT_TIMESTAMP';
    
    const updateQuery = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP${timestampUpdate}
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await query(updateQuery, [status, order_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Obtener datos completos del pedido actualizado
    const completeResult = await query(`
      SELECT o.*, 
             u.full_name as delivery_name, 
             u.phone as delivery_phone
      FROM orders o
      LEFT JOIN users u ON o.delivery_id = u.id
      WHERE o.id = $1
    `, [order_id]);

    res.json({
      message: `✅ Estado actualizado a: ${status}`,
      order: completeResult.rows[0],
      next_status: getNextStatus(status)
    });
    
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

// Ver pedidos del delivery
router.get('/delivery/:delivery_id', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    
    const result = await query(`
      SELECT o.*, c.full_name as client_name, c.phone as client_phone
      FROM orders o
      JOIN users c ON o.client_id = c.id
      WHERE o.delivery_id = $1
      ORDER BY o.created_at DESC
    `, [delivery_id]);

    res.json({
      message: '🏍️ Pedidos del delivery',
      orders: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo pedidos del delivery:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos del delivery' });
  }
});

// Aceptar pedido ofrecido
router.post('/:order_id/accept', async (req, res) => {
  try {
    const { order_id } = req.params;
    const { delivery_id } = req.body;
    
    // Verificar que el pedido esté disponible
    const checkResult = await query('SELECT * FROM orders WHERE id = $1 AND delivery_id IS NULL AND status = $2', [order_id, 'pending']);
    
    if (checkResult.rows.length === 0) {
      return res.status(400).json({ error: 'Pedido no disponible' });
    }
    
    // Asignar delivery y cambiar status
    const result = await query(`
      UPDATE orders 
      SET delivery_id = $1, status = 'accepted', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND delivery_id IS NULL
      RETURNING *
    `, [delivery_id, order_id]);
    
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Pedido ya fue tomado por otro delivery' });
    }
    
    res.json({
      message: 'Pedido aceptado exitosamente',
      order: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error aceptando pedido:', error);
    res.status(500).json({ error: 'Error aceptando pedido' });
  }
});

// Rechazar pedido ofrecido
router.post('/:order_id/reject', async (req, res) => {
  try {
    const { order_id } = req.params;
    const { delivery_id } = req.body;
    
    // Registrar el rechazo
    await query(`
      INSERT INTO delivery_rejections (order_id, delivery_id, rejected_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (order_id, delivery_id) DO UPDATE SET rejected_at = CURRENT_TIMESTAMP
    `, [order_id, delivery_id]);
    
    res.json({ message: 'Pedido rechazado' });
    
  } catch (error) {
    console.error('Error rechazando pedido:', error);
    res.status(500).json({ error: 'Error rechazando pedido' });
  }
});

// Obtener pedidos ofrecidos a un delivery específico
router.get('/offers/:delivery_id', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    
    const result = await query(`
      SELECT o.*, c.full_name as client_name, c.phone as client_phone
      FROM orders o
      JOIN users c ON o.client_id = c.id
      WHERE o.status = 'pending' 
      AND o.delivery_id IS NULL
      AND o.id NOT IN (
        SELECT order_id FROM delivery_rejections 
        WHERE delivery_id = $1 AND rejected_at > NOW() - INTERVAL '1 hour'
      )
      ORDER BY o.created_at ASC
    `, [delivery_id]);
    
    res.json({
      message: 'Pedidos disponibles',
      offers: result.rows
    });
    
  } catch (error) {
    console.error('Error obteniendo ofertas:', error);
    res.status(500).json({ error: 'Error obteniendo ofertas' });
  }
});

// Función helper para determinar el próximo estado
function getNextStatus(currentStatus) {
  const statusFlow = {
    'pending': 'matching',
    'matching': 'accepted',
    'accepted': 'picking_up',
    'picking_up': 'in_transit',
    'in_transit': 'delivered',
    'delivered': null
  };
  return statusFlow[currentStatus];
}

module.exports = router;