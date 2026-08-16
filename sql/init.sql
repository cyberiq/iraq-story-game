CREATE DATABASE IF NOT EXISTS game_catalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE game_catalog;

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name_ar VARCHAR(180) NOT NULL,
  name_en VARCHAR(180) NOT NULL,
  genre VARCHAR(80) NOT NULL,
  release_year INT NOT NULL,
  cover_color VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_games_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_games_release_year (release_year),
  INDEX idx_games_name_en (name_en),
  INDEX idx_games_name_ar (name_ar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
