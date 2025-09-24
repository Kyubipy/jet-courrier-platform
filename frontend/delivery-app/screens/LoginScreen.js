import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  SafeAreaView 
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://jet-courrier-api.onrender.com';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('delivery1@test.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      if (response.data.user.role === 'delivery') {
        // Navegar al dashboard con los datos del usuario
        navigation.replace('Dashboard', { 
          user: response.data.user, 
          token: response.data.token 
        });
      } else {
        Alert.alert('Error', 'Esta app es solo para deliverys');
      }
    } catch (error) {
      console.log('Login error:', error.response?.data || error.message);
      Alert.alert('Error', 'Credenciales incorrectas');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Jet Courrier</Text>
        <Text style={styles.subtitle}>Driver App</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Conectando...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 40
  },
  form: {
    width: '100%'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    fontSize: 16
  },
  button: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7'
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
});