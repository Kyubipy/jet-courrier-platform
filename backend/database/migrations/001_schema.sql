-- UBER DE DELIVERYS - SCHEMA COMPLETO

-- Tabla de usuarios (deliverys y clientes)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('delivery', 'client', 'admin')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_ratings INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Perfil específico de deliverys
CREATE TABLE delivery_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL, -- moto, auto, camion
    license_plate VARCHAR(20),
    document_number VARCHAR(20) UNIQUE NOT NULL,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT false, -- disponible para recibir pedidos
    current_zone VARCHAR(100),
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pedidos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES users(id),
    delivery_id INTEGER REFERENCES users(id),
    
    -- Ubicaciones
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    delivery_lat DECIMAL(10, 8) NOT NULL,
    delivery_lng DECIMAL(11, 8) NOT NULL,
    
    -- Detalles del pedido
    description TEXT,
    package_type VARCHAR(50) DEFAULT 'general',
    estimated_distance DECIMAL(8, 2), -- km
    estimated_duration INTEGER, -- minutos
    
    -- Precios
    base_price DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    platform_commission DECIMAL(10, 2), -- nuestra ganancia
    delivery_payment DECIMAL(10, 2), -- lo que recibe el delivery
    
    -- Estado y tracking
    status VARCHAR(30) CHECK (status IN ('pending', 'matching', 'accepted', 'picking_up', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracking en tiempo real de deliverys
CREATE TABLE delivery_locations (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2), -- km/h
    heading INTEGER, -- grados 0-360
    accuracy DECIMAL(8, 2), -- metros
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de matching (para analytics)
CREATE TABLE matching_attempts (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    delivery_id INTEGER REFERENCES users(id),
    distance_km DECIMAL(8, 2),
    response_time_seconds INTEGER,
    result VARCHAR(20) CHECK (result IN ('accepted', 'rejected', 'timeout')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings y reviews
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    from_user_id INTEGER REFERENCES users(id), -- quien califica
    to_user_id INTEGER REFERENCES users(id), -- a quien califican
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zonas de cobertura
CREATE TABLE coverage_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    polygon_coordinates JSONB, -- coordenadas del polígono
    is_active BOOLEAN DEFAULT true,
    delivery_fee_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES PARA PERFORMANCE SÚPER RÁPIDA
CREATE INDEX idx_delivery_profiles_location ON delivery_profiles (current_lat, current_lng, is_online, is_available);
CREATE INDEX idx_delivery_profiles_available ON delivery_profiles (is_available, is_online, current_zone);
CREATE INDEX idx_orders_status ON orders (status, created_at);
CREATE INDEX idx_orders_delivery_id ON orders (delivery_id, status);
CREATE INDEX idx_orders_client_id ON orders (client_id, created_at);
CREATE INDEX idx_delivery_locations_order ON delivery_locations (order_id, timestamp DESC);
CREATE INDEX idx_delivery_locations_delivery ON delivery_locations (delivery_id, timestamp DESC);

-- FUNCIONES Y TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para calcular distancia entre dos puntos (haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    r DECIMAL := 6371; -- Radio de la Tierra en km
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql;

-- Vista para deliverys disponibles con su ubicación
CREATE VIEW available_deliverys AS
SELECT 
    u.id,
    u.full_name,
    u.phone,
    u.rating,
    dp.vehicle_type,
    dp.current_lat,
    dp.current_lng,
    dp.current_zone,
    dp.total_deliveries,
    dp.last_location_update
FROM users u
JOIN delivery_profiles dp ON u.id = dp.user_id
WHERE u.role = 'delivery' 
  AND u.is_active = true 
  AND dp.is_online = true 
  AND dp.is_available = true;