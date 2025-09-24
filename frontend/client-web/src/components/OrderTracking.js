import React, { useState, useEffect, useRef } from 'react';
import { orderAPI } from '../services/api';
import io from 'socket.io-client';

function OrderTracking({ order, onBack }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [deliveryMarker, setDeliveryMarker] = useState(null);
  const [orderDetails, setOrderDetails] = useState(order);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current && !map) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: -25.2637, lng: -57.5759 },
        zoom: 13,
      });

      // Marcadores de origen y destino
      new window.google.maps.Marker({
        position: { lat: -25.2637, lng: -57.5759 },
        map: googleMap,
        title: 'Punto de recogida',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
      });

      new window.google.maps.Marker({
        position: { lat: -25.2800, lng: -57.5900 },
        map: googleMap,
        title: 'Punto de entrega',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
      });

      setMap(googleMap);
    }
  }, [map]);

  // Conectar WebSocket para tracking real
  useEffect(() => {
    const newSocket = io('https://jet-courrier-api.onrender.com');
    
    newSocket.on('connect', () => {
      console.log('Conectado a tracking en tiempo real');
      setConnected(true);
      // Suscribirse al tracking del pedido
      newSocket.emit('track_order', order.id);
    });

    newSocket.on('delivery_location', (locationData) => {
      console.log('Ubicación delivery actualizada:', locationData);
      setDeliveryLocation({
        lat: parseFloat(locationData.latitude),
        lng: parseFloat(locationData.longitude),
        timestamp: new Date()
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del tracking');
      setConnected(false);
    });

    setSocket(newSocket);

    // Actualizar detalles del pedido cada 30 segundos
    const interval = setInterval(async () => {
      try {
        const response = await orderAPI.getOrderDetails(order.id);
        setOrderDetails(response.data.order);
      } catch (error) {
        console.error('Error actualizando pedido:', error);
      }
    }, 30000);

    return () => {
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, [order.id]);

  // Actualizar marcador del delivery en el mapa
  useEffect(() => {
    if (map && deliveryLocation) {
      if (deliveryMarker) {
        deliveryMarker.setPosition(deliveryLocation);
      } else {
        const marker = new window.google.maps.Marker({
          position: deliveryLocation,
          map: map,
          title: 'Delivery en movimiento',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          }
        });
        setDeliveryMarker(marker);
      }
    }
  }, [map, deliveryLocation, deliveryMarker]);

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Buscando delivery...',
      'matching': 'Asignando delivery...',
      'accepted': 'Delivery asignado',
      'picking_up': 'Recogiendo tu paquete',
      'in_transit': 'En camino hacia destino',
      'delivered': 'Entregado ✓'
    };
    return statusMap[status] || status;
  };

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack} style={{ marginBottom: '20px' }}>← Volver</button>
      
      <h2>Pedido #{orderDetails.id}</h2>
      
      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h3>{getStatusText(orderDetails.status)}</h3>
        {connected ? (
          <span style={{ color: 'green' }}>🟢 Tracking en tiempo real activo</span>
        ) : (
          <span style={{ color: 'orange' }}>🟡 Conectando...</span>
        )}
      </div>

      <div style={{ margin: '20px 0' }}>
        <p><strong>Desde:</strong> {orderDetails.pickup_address}</p>
        <p><strong>Hasta:</strong> {orderDetails.delivery_address}</p>
        <p><strong>Total:</strong> ₲{orderDetails.total_price}</p>
        
        {orderDetails.delivery_name && (
          <div style={{ background: '#f0f8ff', padding: '10px', borderRadius: '5px', margin: '10px 0' }}>
            <h4>Tu delivery:</h4>
            <p>{orderDetails.delivery_name}</p>
            <p>{orderDetails.delivery_phone}</p>
          </div>
        )}
      </div>

      {deliveryLocation && (
        <div style={{ background: '#f0f8ff', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
          <h4>📍 Ubicación del delivery:</h4>
          <p>Última actualización: {deliveryLocation.timestamp.toLocaleTimeString()}</p>
          <p>Coordenadas: {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}</p>
        </div>
      )}

      <div 
        ref={mapRef}
        style={{
          height: '400px',
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}
      />
    </div>
  );
}

export default OrderTracking;