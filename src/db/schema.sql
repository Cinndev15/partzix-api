-- Drop tables if they exist in correct dependency order
DROP TABLE IF EXISTS `brands`;
DROP TABLE IF EXISTS `sublines`;
DROP TABLE IF EXISTS `lines`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `provider_profiles`;
DROP TABLE IF EXISTS `warehouses`;
DROP TABLE IF EXISTS `email_verifications`;
DROP TABLE IF EXISTS `phone_verifications`;

-- Table structure for warehouses
CREATE TABLE `warehouses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `identification_number` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `country` VARCHAR(100) DEFAULT 'Colombia',
  `department` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `contact_person` VARCHAR(150) DEFAULT NULL,
  `user_class` VARCHAR(100) NOT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `is_email_verified` BOOLEAN DEFAULT FALSE,
  `status` ENUM('Por Aprobar', 'Aprobado', 'Negado') DEFAULT 'Por Aprobar',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_identification` (`identification_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for email verifications (OTP)
CREATE TABLE `email_verifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_code` (`email`, `code`),
  INDEX `idx_email_verified` (`email`, `verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for provider profiles (Step 2 configuration)
CREATE TABLE `provider_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT NOT NULL UNIQUE,
  `short_name` VARCHAR(100) NOT NULL,
  `advisor_phone` VARCHAR(20) NOT NULL,
  `advisor_whatsapp` VARCHAR(20) NOT NULL,
  `store_address` VARCHAR(255) NOT NULL,
  `country` VARCHAR(100) DEFAULT 'Colombia',
  `department` VARCHAR(100) NOT NULL,
  `store_city` VARCHAR(100) NOT NULL,
  `specialty` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `logo_path` VARCHAR(255) DEFAULT NULL,
  `rut_doc_path` VARCHAR(255) NOT NULL,
  `id_doc_path` VARCHAR(255) NOT NULL,
  `chamber_of_commerce_doc_path` VARCHAR(255) NOT NULL,
  `received_advisor_assistance` BOOLEAN DEFAULT FALSE,
  `registrar_name` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_provider_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for users (Authentication & Roles)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'warehouse') DEFAULT 'warehouse',
  `status` ENUM('pending', 'approved', 'suspended') DEFAULT 'pending',
  `warehouse_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for password resets
CREATE TABLE `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `token` VARCHAR(100) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_token` (`email`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (Password: AdminPartzix2026!)
INSERT INTO `users` (email, password_hash, role, status)
VALUES ('admin@partzix.com', '$2b$10$QHRlHU2BreLqtBBumYD4FOG5obRG8VHUwgRZSQ0z/KKDhMTPsny0y', 'admin', 'approved');

-- Insert new admin user (Password: Fergoga0803)
INSERT INTO `users` (email, password_hash, role, status)
VALUES ('fgonzalez@partzix.com', '$2b$10$FquFVfRK9YgEf8PyQOD3vebUzjhKPsqRgdwSJmsK8RDbQcXqUJkPG', 'admin', 'approved');

-- Table structure for categories
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_category_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for lines
CREATE TABLE `lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_line_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_line_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_category_line` (`category_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for sublines
CREATE TABLE `sublines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `line_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_subline_line` FOREIGN KEY (`line_id`) REFERENCES `lines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subline_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_line_subline` (`line_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for brands
CREATE TABLE `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_brand_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_brand_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_brand_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_category_brand` (`category_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

