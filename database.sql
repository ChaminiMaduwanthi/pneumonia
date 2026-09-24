CREATE DATABASE IF NOT EXISTS pneumonia_ai;
USE pneumonia_ai;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('patient','doctor','researcher','admin') DEFAULT 'patient',
  avatar VARCHAR(255),
  phone VARCHAR(20),
  dob DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  original_image VARCHAR(255) NOT NULL,
  gradcam_image VARCHAR(255),
  disease VARCHAR(100),
  disease_confidence FLOAT,
  severity ENUM('mild','moderate','severe','normal'),
  severity_confidence FLOAT,
  viral_score FLOAT,
  bacterial_score FLOAT,
  normal_score FLOAT,
  covid_score FLOAT,
  model VARCHAR(50),
  explanation TEXT,
  patient_notes TEXT,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
