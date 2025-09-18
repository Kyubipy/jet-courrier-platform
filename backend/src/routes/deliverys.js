const express = require('express');
const router = express.Router();

// Rutas básicas de deliverys (expandir después)
router.get('/', (req, res) => {
  res.json({ message: 'Deliverys API - Coming soon' });
});

module.exports = router;