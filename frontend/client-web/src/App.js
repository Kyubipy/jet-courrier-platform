import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RequestDelivery from './pages/RequestDelivery';
import OrderTracking from './components/OrderTracking';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('request');
  const [activeOrder, setActiveOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setOrders([]);
  };

  const handleOrderCreated = (order) => {
    setActiveOrder(order);
    setCurrentPage('tracking');
    setOrders([...orders, order]);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h1>Jet Courrier</h1>
        <div>
          <span>Hola, {user.full_name}</span>
          <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Salir</button>
        </div>
      </header>

      <nav style={{ margin: '20px 0' }}>
        <button 
          onClick={() => setCurrentPage('request')}
          style={{ marginRight: '10px', padding: '10px', background: currentPage === 'request' ? '#007bff' : '#f0f0f0' }}
        >
          Solicitar Delivery
        </button>
        <button 
          onClick={() => setCurrentPage('history')}
          style={{ padding: '10px', background: currentPage === 'history' ? '#007bff' : '#f0f0f0' }}
        >
          Mis Pedidos ({orders.length})
        </button>
      </nav>

      <main>
        {currentPage === 'request' && (
          <RequestDelivery user={user} onOrderCreated={handleOrderCreated} />
        )}
        
        {currentPage === 'tracking' && activeOrder && (
          <OrderTracking 
            order={activeOrder} 
            onBack={() => setCurrentPage('request')} 
          />
        )}
        
        {currentPage === 'history' && (
          <div>
            <h2>Historial de Pedidos</h2>
            {orders.map(order => (
              <div key={order.id} style={{ border: '1px solid #ddd', padding: '15px', margin: '10px 0' }}>
                <p><strong>#{order.id}</strong> - {order.status}</p>
                <p>{order.pickup_address} → {order.delivery_address}</p>
                <p>₲{order.total_price}</p>
                <button onClick={() => {
                  setActiveOrder(order);
                  setCurrentPage('tracking');
                }}>
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;