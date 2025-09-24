import React, { useState } from 'react';
import { orderAPI, matchingAPI } from '../services/api';

function RequestDelivery({ user, onOrderCreated }) {
  const [formData, setFormData] = useState({
    pickup_address: 'Av. Mcal. López 1234, Asunción',
    delivery_address: 'Av. Eusebio Ayala 2345, Asunción',
    description: 'Documentos importantes',
    package_type: 'general'
  });
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculatePrice = async () => {
    if (!formData.pickup_address || !formData.delivery_address) {
      alert('Completa las direcciones primero');
      return;
    }

    setLoading(true);
    try {
      // Coordenadas de Asunción (después integrar geocoding real)
      const coordinates = {
        pickup_lat: -25.2637,
        pickup_lng: -57.5759
      };

      const response = await matchingAPI.findDelivery(coordinates);
      setPricing(response.data.pricing);
    } catch (error) {
      console.error('Error calculando precio:', error);
      alert('Error calculando precio. Intenta nuevamente.');
    }
    setLoading(false);
  };

  const createOrder = async () => {
    if (!pricing) {
      alert('Calcula el precio primero');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        client_id: user.id,
        pickup_address: formData.pickup_address,
        delivery_address: formData.delivery_address,
        pickup_lat: -25.2637, // Después integrar geocoding real
        pickup_lng: -57.5759,
        delivery_lat: -25.2800,
        delivery_lng: -57.5900,
        description: formData.description,
        package_type: formData.package_type
      };

      const response = await orderAPI.create(orderData);
      onOrderCreated(response.data.order);
    } catch (error) {
      alert('Error creando pedido');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Solicitar Delivery</h2>
      
      <div>
        <label>Dirección de recogida:</label>
        <input
          type="text"
          placeholder="Desde dónde recogemos"
          value={formData.pickup_address}
          onChange={(e) => setFormData({...formData, pickup_address: e.target.value})}
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />

        <label>Dirección de entrega:</label>
        <input
          type="text"
          placeholder="Hacia dónde llevamos"
          value={formData.delivery_address}
          onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />

        <label>Descripción del paquete:</label>
        <textarea
          placeholder="Describe qué vas a enviar"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />

        <button onClick={calculatePrice} disabled={loading} style={{ width: '100%', padding: '10px', margin: '10px 0' }}>
          {loading ? 'Calculando...' : 'Calcular Precio'}
        </button>

        {pricing && (
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '5px', margin: '20px 0' }}>
            <h3>Costo del delivery:</h3>
            <p>Distancia: {pricing.distance_km} km</p>
            <p>Precio base: ₲{pricing.base_price}</p>
            <p>Por kilómetro: ₲{pricing.price_per_km}</p>
            <p>Tarifa delivery: ₲{pricing.delivery_fee}</p>
            <h4>Total: ₲{pricing.total_price}</h4>
            
            <button onClick={createOrder} disabled={loading} style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none' }}>
              Confirmar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestDelivery;