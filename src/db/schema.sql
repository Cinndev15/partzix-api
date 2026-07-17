-- Drop tables if they exist in correct dependency order
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
