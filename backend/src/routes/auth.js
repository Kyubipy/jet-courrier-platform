const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../database/connection');

const router = express.Router();

// Registro de delivery
router.post('/register/delivery', async (req, res) => {
  try {
    const { email, password, phone, full_name, vehicle_type, license_plate, document_number } = req.body;
    
    // Validaciones
    if (!email || !password || !phone || !full_name || !vehicle_type || !document_number) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si ya existe
    const existingUser = await query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe con ese email o teléfono' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const userResult = await query(
      'INSERT INTO users (email, password, phone, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, phone, full_name, 'delivery']
    );

    const userId = userResult.rows[0].id;

    // Crear perfil de delivery
    await query(
      `INSERT INTO delivery_profiles (user_id, vehicle_type, license_plate, document_number) 
       VALUES ($1, $2, $3, $4)`,
      [userId, vehicle_type, license_plate, document_number]
    );

    // JWT token
    const token = jwt.sign({ userId, role: 'delivery' }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: '🏍️ Delivery registrado exitosamente',
      user: { id: userId, email, full_name, role: 'delivery' },
      token
    });

  } catch (error) {
    console.error('Error registro delivery:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registro de cliente
router.post('/register/client', async (req, res) => {
  try {
    const { email, password, phone, full_name } = req.body;
    
    if (!email || !password || !phone || !full_name) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si ya existe
    const existingUser = await query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await query(
      'INSERT INTO users (email, password, phone, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, phone, full_name, 'client']
    );

    const userId = result.rows[0].id;
    const token = jwt.sign({ userId, role: 'client' }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: '👤 Cliente registrado exitosamente',
      user: { id: userId, email, full_name, role: 'client' },
      token
    });

  } catch (error) {
    console.error('Error registro cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password requeridos' });
    }

    // Buscar usuario
    const result = await query('SELECT id, email, password, full_name, role FROM users WHERE email = $1 AND is_active = true', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: `✅ Login exitoso como ${user.role}`,
      user: { 
        id: user.id, 
        email: user.email, 
        full_name: user.full_name, 
        role: user.role 
      },
      token
    });

  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;