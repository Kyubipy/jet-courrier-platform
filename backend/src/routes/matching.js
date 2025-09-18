const express = require('express');
const { query } = require('../../database/connection');

const router = express.Router();

// EL ALGORITMO PRINCIPAL DE MATCHING
router.post('/find-delivery', async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, delivery_lat, delivery_lng } = req.body;
    
    if (!pickup_lat || !pickup_lng) {
      return res.status(400).json({ error: 'Coordenadas de recogida requeridas' });
    }

    const maxRadius = process.env.MATCHING_RADIUS_KM || 5;

    // 🧠 ALGORITMO SUPERINTELIGENTE DE MATCHING
    const matchingQuery = `
      SELECT 
        ad.*,
        calculate_distance_km($1, $2, ad.current_lat, ad.current_lng) as distance_km
      FROM available_deliverys ad
      WHERE calculate_distance_km($1, $2, ad.current_lat, ad.current_lng) <= $3
      ORDER BY 
        -- Prioridad: 1) Distancia, 2) Rating, 3) Experiencia
        distance_km ASC,
        ad.rating DESC,
        ad.total_deliveries DESC
      LIMIT 10
    `;

    const deliverysResult = await query(matchingQuery, [pickup_lat, pickup_lng, maxRadius]);

    if (deliverysResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No hay deliverys disponibles en la zona',
        message: `No se encontraron deliverys en un radio de ${maxRadius}km`
      });
    }

    // Calcular precio estimado
    const estimatedDistance = deliverysResult.rows[0].distance_km;
    const basePrice = 10000; // 10.000 guaraníes
    const pricePerKm = 2000;  // 2.000 por km
    const deliveryFee = 5000; // 5.000 tarifa de delivery
    
    const totalPrice = basePrice + (estimatedDistance * pricePerKm) + deliveryFee;
    const platformCommission = totalPrice * 0.20; // 20% para la plataforma
    const deliveryPayment = totalPrice - platformCommission;

    res.json({
      message: '🧠 Deliverys encontrados por el algoritmo',
      available_deliverys: deliverysResult.rows.length,
      recommended_delivery: deliverysResult.rows[0],
      all_deliverys: deliverysResult.rows,
      pricing: {
        base_price: basePrice,
        distance_km: estimatedDistance,
        price_per_km: pricePerKm,
        delivery_fee: deliveryFee,
        total_price: totalPrice,
        platform_commission: platformCommission,
        delivery_payment: deliveryPayment
      },
      matching_radius_km: maxRadius
    });

  } catch (error) {
    console.error('Error en matching:', error);
    res.status(500).json({ error: 'Error en el algoritmo de matching' });
  }
});

// Notificar delivery (simulación de push notification)
router.post('/notify-delivery', async (req, res) => {
  try {
    const { delivery_id, order_details } = req.body;

    // Aquí iría la lógica de push notification real
    console.log(`📱 Enviando notificación a delivery ${delivery_id}:`, order_details);

    // Simular envío de notificación
    const notificationData = {
      title: '🚨 Nuevo Pedido Disponible',
      body: `Pedido desde ${order_details.pickup_address}`,
      data: {
        order_id: order_details.id,
        pickup_address: order_details.pickup_address,
        delivery_address: order_details.delivery_address,
        estimated_payment: order_details.delivery_payment
      }
    };

    res.json({
      message: '📱 Notificación enviada exitosamente',
      delivery_id,
      notification: notificationData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ error: 'Error enviando notificación' });
  }
});

module.exports = router;