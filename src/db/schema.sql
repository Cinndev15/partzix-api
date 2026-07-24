
-- Table structure for warehouses
CREATE TABLE IF NOT EXISTS `warehouses` (
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
CREATE TABLE IF NOT EXISTS `email_verifications` (
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
CREATE TABLE IF NOT EXISTS `provider_profiles` (
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
CREATE TABLE IF NOT EXISTS `users` (
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
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL,
  `token` VARCHAR(100) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_email_token` (`email`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (Password: AdminPartzix2026!)
INSERT IGNORE INTO `users` (email, password_hash, role, status)
VALUES ('admin@partzix.com', '$2b$10$QHRlHU2BreLqtBBumYD4FOG5obRG8VHUwgRZSQ0z/KKDhMTPsny0y', 'admin', 'approved');

-- Insert new admin user (Password: Fergoga0803)
INSERT IGNORE INTO `users` (email, password_hash, role, status)
VALUES ('fgonzalez@partzix.com', '$2b$10$FquFVfRK9YgEf8PyQOD3vebUzjhKPsqRgdwSJmsK8RDbQcXqUJkPG', 'admin', 'approved');

-- Table structure for categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_category_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for lines
CREATE TABLE IF NOT EXISTS `lines` (
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
CREATE TABLE IF NOT EXISTS `sublines` (
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
CREATE TABLE IF NOT EXISTS `brands` (
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

-- Table structure for models
CREATE TABLE IF NOT EXISTS `models` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `brand_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_model_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_model_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_model_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_category_brand_model` (`category_id`, `brand_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for years
CREATE TABLE IF NOT EXISTS `years` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `year` INT NOT NULL UNIQUE,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_year_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_brands
CREATE TABLE IF NOT EXISTS `product_brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_brand_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_brand_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_product_brand_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_warehouse_product_brand` (`warehouse_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for displacements
CREATE TABLE IF NOT EXISTS `displacements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `displacement` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_displacement_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_displacement_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_displacement_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_category_displacement` (`category_id`, `displacement`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for taxes
CREATE TABLE IF NOT EXISTS `taxes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `rate_percent` DECIMAL(5,2) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default taxes
INSERT IGNORE INTO `taxes` (name, rate_percent, description) VALUES
('IVA 19%', 19.00, 'Impuesto sobre el Valor Añadido general del 19%'),
('IVA 5%', 5.00, 'Impuesto sobre el Valor Añadido reducido del 5%'),
('Exento', 0.00, 'Exento de Impuestos');

-- Table structure for products
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` INT NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `commercial_name` VARCHAR(255) NOT NULL,
  `factory_reference` VARCHAR(255) DEFAULT NULL,
  `stock_units` INT NOT NULL DEFAULT 0,
  `sale_price` DECIMAL(12,2) NOT NULL,
  `product_brand_id` INT DEFAULT NULL,
  `category_id` INT NOT NULL,
  `line_id` INT DEFAULT NULL,
  `subline_id` INT DEFAULT NULL,
  `provider_profile_id` INT DEFAULT NULL,
  `consecutive_code` VARCHAR(50) NOT NULL,
  `status` VARCHAR(100) DEFAULT 'Activo (Visible en tienda)',
  `is_featured` BOOLEAN DEFAULT FALSE,
  `spare_part_type` VARCHAR(100) DEFAULT 'Genérico',
  `mechanical_position` VARCHAR(100) DEFAULT NULL,
  `vehicle_side` VARCHAR(100) DEFAULT NULL,
  `compatible_transmission_type` VARCHAR(100) DEFAULT NULL,
  `technical_description` TEXT DEFAULT NULL,
  `created_by` INT NOT NULL,
  `updated_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_product_brand` FOREIGN KEY (`product_brand_id`) REFERENCES `product_brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_product_line` FOREIGN KEY (`line_id`) REFERENCES `lines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_subline` FOREIGN KEY (`subline_id`) REFERENCES `sublines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_provider` FOREIGN KEY (`provider_profile_id`) REFERENCES `provider_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_product_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `unique_warehouse_sku` (`warehouse_id`, `sku`),
  UNIQUE KEY `unique_consecutive_code` (`consecutive_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_models (Compatibility)
CREATE TABLE IF NOT EXISTS `product_models` (
  `product_id` INT NOT NULL,
  `model_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `model_id`),
  CONSTRAINT `fk_pm_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_years (Compatibility)
CREATE TABLE IF NOT EXISTS `product_years` (
  `product_id` INT NOT NULL,
  `year_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `year_id`),
  CONSTRAINT `fk_py_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_py_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_displacements (Compatibility)
CREATE TABLE IF NOT EXISTS `product_displacements` (
  `product_id` INT NOT NULL,
  `displacement_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `displacement_id`),
  CONSTRAINT `fk_pd_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pd_displacement` FOREIGN KEY (`displacement_id`) REFERENCES `displacements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_taxes (Applicable taxes)
CREATE TABLE IF NOT EXISTS `product_taxes` (
  `product_id` INT NOT NULL,
  `tax_id` INT NOT NULL,
  PRIMARY KEY (`product_id`, `tax_id`),
  CONSTRAINT `fk_pt_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pt_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for product_images
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `image_path` VARCHAR(255) NOT NULL,
  `is_main` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

