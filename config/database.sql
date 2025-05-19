-- Create the main database
CREATE DATABASE IF NOT EXISTS bfpkonekt_db;
USE bfpkonekt_db;

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    confidence INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Source information
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    source_name VARCHAR(255),
    post_id VARCHAR(255),
    comment_id VARCHAR(255),
    
    -- Location information
    location_name VARCHAR(255),
    city VARCHAR(255) DEFAULT 'Dasmariñas City',
    province VARCHAR(255) DEFAULT 'Cavite',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp),
    INDEX idx_confidence (confidence)
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) DEFAULT 'general',
    priority INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id),
    INDEX idx_is_read (is_read)
);

-- Facebook pages to monitor
CREATE TABLE IF NOT EXISTS monitored_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,
    page_name VARCHAR(255) NOT NULL,
    access_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active)
);

-- Insert default keywords
INSERT INTO keywords (keyword, type, priority) VALUES
('sunog', 'fire', 3),
('fire', 'fire', 3),
('emergency', 'emergency', 3),
('apoy', 'fire', 2),
('incident', 'general', 1),
('fire alarm', 'fire', 2),
('fire incident', 'fire', 3),
('residential fire', 'fire', 3),
('commercial fire', 'fire', 3),
('structural fire', 'fire', 3),
('#BFPDasma', 'hashtag', 1),
('#FireAlert', 'hashtag', 2);

-- Insert default monitored page
INSERT INTO monitored_pages (page_id, page_name) VALUES
('100069248977961', 'BFP Dasmariñas City Fire Station'); 