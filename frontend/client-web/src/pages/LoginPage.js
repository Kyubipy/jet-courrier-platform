import React, { useState } from 'react';
import { authAPI } from '../services/api';

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    email: 'maria@test.com',
    password: '123456'
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = isLogin 
        ? await authAPI.login(formData.email, formData.password)
        : await authAPI.register(formData);

      if (response.data.user.role === 'client') {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      } else {
        alert('Esta plataforma es solo para clientes');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Error en la autenticación');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Jet Courrier</h1>
      <p>Solicita tu delivery</p>
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          style={{ width: '100%', padding: '10px', margin: '5px 0' }}
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          style={{ width: '100%', padding: '10px', margin: '5px 0' }}
          required
        />

        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.full_name || ''}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              style={{ width: '100%', padding: '10px', margin: '5px 0' }}
              required
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              style={{ width: '100%', padding: '10px', margin: '5px 0' }}
              required
            />
          </>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Conectando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
        </button>
      </form>

      <p onClick={() => setIsLogin(!isLogin)} style={{ textAlign: 'center', cursor: 'pointer', color: '#007bff', marginTop: '15px' }}>
        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </p>
    </div>
  );
}

export default LoginPage;