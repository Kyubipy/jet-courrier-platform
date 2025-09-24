import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://jet-courrier-api.onrender.com';

export default function DashboardScreen({ route, navigation }) {
  const { user, token } = route.params;
  const [myOrders, setMyOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllOrders();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchAllOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      // Pedidos asignados a mí
      const myOrdersResponse = await axios.get(`${API_URL}/api/orders/delivery/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyOrders(myOrdersResponse.data.orders || []);

      // Pedidos disponibles (pending, cerca de mí)
      const availableResponse = await axios.get(`${API_URL}/api/orders/client/2`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filtrar solo pedidos pending sin delivery asignado
      const pending = availableResponse.data.orders?.filter(order => 
        order.status === 'pending' && !order.delivery_id
      ) || [];
      setAvailableOrders(pending);

    } catch (error) {
      console.log('Error fetching orders:', error.response?.data || error.message);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const acceptOrder = async (orderId) => {
    try {
      // Paso 1: Asignar delivery_id
      await axios.patch(`${API_URL}/api/orders/${orderId}`, {
        delivery_id: user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Paso 2: Cambiar status a accepted
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, {
        status: 'accepted'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('¡Pedido aceptado!', 'El pedido ha sido asignado a ti');
      fetchAllOrders(); // Refresh para ver cambios
    } catch (error) {
      console.log('Error completo:', error.response?.data || error.message);
      Alert.alert('Error', 'No se pudo aceptar el pedido');
    }
  };

  const changeOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchAllOrders(); // Refresh
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const renderAvailableOrder = ({ item }) => (
    <View style={[styles.orderCard, styles.availableOrder]}>
      <Text style={styles.orderLabel}>🆕 NUEVO PEDIDO</Text>
      <Text style={styles.orderAddress}>Desde: {item.pickup_address}</Text>
      <Text style={styles.orderAddress}>Hasta: {item.delivery_address}</Text>
      <Text style={styles.orderPrice}>Pago: ₲{item.total_price}</Text>
      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => acceptOrder(item.id)}
      >
        <Text style={styles.acceptButtonText}>ACEPTAR PEDIDO</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMyOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderAddress}>Desde: {item.pickup_address}</Text>
      <Text style={styles.orderAddress}>Hasta: {item.delivery_address}</Text>
      <Text style={styles.orderStatus}>Estado: {item.status}</Text>
      <Text style={styles.orderPrice}>Pago: ₲{item.delivery_payment || item.total_price}</Text>
      
      {item.status === 'accepted' && (
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => changeOrderStatus(item.id, 'picking_up')}
        >
          <Text style={styles.statusButtonText}>🚗 Ir a recoger</Text>
        </TouchableOpacity>
      )}
      
      {item.status === 'picking_up' && (
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => changeOrderStatus(item.id, 'in_transit')}
        >
          <Text style={styles.statusButtonText}>📦 En camino</Text>
        </TouchableOpacity>
      )}
      
      {item.status === 'in_transit' && (
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => changeOrderStatus(item.id, 'delivered')}
        >
          <Text style={styles.statusButtonText}>✅ Entregado</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenido {user.full_name}</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchAllOrders();
          }} />
        }
        ListHeaderComponent={
          <>
            {availableOrders.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>🚨 Pedidos Disponibles</Text>
                <FlatList
                  data={availableOrders}
                  renderItem={renderAvailableOrder}
                  keyExtractor={(item) => `available-${item.id}`}
                  scrollEnabled={false}
                />
              </>
            )}
            
            <Text style={styles.sectionTitle}>📋 Mis Pedidos</Text>
          </>
        }
        data={myOrders}
        renderItem={renderMyOrder}
        keyExtractor={(item) => `my-${item.id}`}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loadingText}>Cargando pedidos...</Text>
          ) : (
            <Text style={styles.noOrdersText}>No tienes pedidos asignados</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 8
  },
  logoutText: {
    color: 'white',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 10,
    color: '#2c3e50'
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed'
  },
  availableOrder: {
    borderColor: '#28a745',
    borderWidth: 2,
    backgroundColor: '#f8fff9'
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 8
  },
  orderAddress: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4
  },
  orderStatus: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10
  },
  acceptButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  statusButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  loadingText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20
  },
  noOrdersText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 20
  }
});