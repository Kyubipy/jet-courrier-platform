const express = require('express');
const router = express.Router();

// Rutas básicas de clientes (expandir después)
router.get('/', (req, res) => {
  res.json({ message: 'Clients API - Coming soon' });
});

module.exports = router;