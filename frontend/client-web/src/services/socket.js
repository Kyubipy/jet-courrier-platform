import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io('https://jet-courrier-api.onrender.com', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket desconectado');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión socket:', error);
    });

    return this.socket;
  }

  trackOrder(orderId, callback) {
    if (!this.socket) this.connect();
    
    // Suscribirse al tracking del pedido
    this.socket.emit('track_order', orderId);
    
    // Escuchar updates de ubicación
    this.socket.on('delivery_location', callback);
  }

  stopTracking(orderId) {
    if (this.socket) {
      this.socket.off('delivery_location');
      this.socket.emit('stop_tracking', orderId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();