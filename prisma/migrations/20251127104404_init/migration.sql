-- CreateTable
CREATE TABLE `Account` (
    `user_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(50) NULL,
    `last_name` VARCHAR(50) NULL,
    `birth_date` DATE NULL,
    `gender` VARCHAR(50) NULL,
    `phone_number` VARCHAR(10) NULL,
    `user_id_line` VARCHAR(50) NULL,
    `email` VARCHAR(50) NULL,
    `password` VARCHAR(255) NULL,
    `position` VARCHAR(50) NULL,

    PRIMARY KEY (`user_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Area` (
    `area_id` INTEGER NOT NULL AUTO_INCREMENT,
    `farm_id` INTEGER NOT NULL,
    `area_name` VARCHAR(100) NULL,
    `created_at` DATETIME(0) NULL,

    INDEX `farm_id`(`farm_id`),
    PRIMARY KEY (`area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `device_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `device_code` VARCHAR(100) NULL,
    `created_at` DATETIME(0) NULL,
    `status` VARCHAR(20) NULL,

    PRIMARY KEY (`device_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Farm` (
    `farm_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_ID` INTEGER NOT NULL,
    `area` FLOAT NULL,
    `farm_name` VARCHAR(50) NULL,
    `gender` VARCHAR(50) NULL,
    `rice_variety` VARCHAR(10) NULL,
    `planting_method` VARCHAR(50) NULL,
    `soil_type` VARCHAR(50) NULL,
    `water_management` VARCHAR(100) NULL,
    `address` TEXT NULL,

    INDEX `user_ID`(`user_ID`),
    PRIMARY KEY (`farm_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Growth_Analysis` (
    `analysis_id` INTEGER NOT NULL AUTO_INCREMENT,
    `growth_stage` VARCHAR(100) NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `device_registrations_ID` INTEGER NOT NULL,

    INDEX `device_registrations_ID`(`device_registrations_ID`),
    PRIMARY KEY (`analysis_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Logs` (
    `logs_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `user_ID` INTEGER NOT NULL,
    `ip_address` VARCHAR(30) NULL,
    `action` VARCHAR(225) NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_ID`(`user_ID`),
    PRIMARY KEY (`logs_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Logs_Alert` (
    `logs_alert_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `device_ID` INTEGER NOT NULL,
    `alert_message` TEXT NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `device_ID`(`device_ID`),
    PRIMARY KEY (`logs_alert_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OTP` (
    `otp_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `otp_code` VARCHAR(10) NOT NULL,
    `is_verified` BOOLEAN NULL DEFAULT false,
    `expired_at` DATETIME(0) NOT NULL,

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`otp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permanent_Data` (
    `permanent_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `device_registrations_ID` INTEGER NOT NULL,
    `sensor_type` INTEGER NOT NULL,
    `value` FLOAT NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `measured_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `device_registrations_ID`(`device_registrations_ID`),
    INDEX `sensor_type`(`sensor_type`),
    PRIMARY KEY (`permanent_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sensor_Type` (
    `sensor_type_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,

    PRIMARY KEY (`sensor_type_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User_Settings` (
    `user_settings_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `data_send_interval_days` VARCHAR(50) NOT NULL,
    `Water_level` FLOAT NULL,
    `updated_at` BOOLEAN NULL DEFAULT true,
    `device_registrations_ID` INTEGER NOT NULL,

    INDEX `device_registrations_ID`(`device_registrations_ID`),
    PRIMARY KEY (`user_settings_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_registrations` (
    `device_registrations_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `user_ID` INTEGER NOT NULL,
    `device_ID` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NULL DEFAULT 'active',
    `area_id` INTEGER NOT NULL,
    `registered_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `area_id`(`area_id`),
    INDEX `user_ID`(`user_ID`),
    PRIMARY KEY (`device_registrations_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Area` ADD CONSTRAINT `Area_ibfk_1` FOREIGN KEY (`farm_id`) REFERENCES `Farm`(`farm_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Farm` ADD CONSTRAINT `Farm_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `Account`(`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Growth_Analysis` ADD CONSTRAINT `Growth_Analysis_ibfk_1` FOREIGN KEY (`device_registrations_ID`) REFERENCES `device_registrations`(`device_registrations_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Logs` ADD CONSTRAINT `Logs_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `Account`(`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Logs_Alert` ADD CONSTRAINT `Logs_Alert_ibfk_1` FOREIGN KEY (`device_ID`) REFERENCES `device_registrations`(`device_registrations_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OTP` ADD CONSTRAINT `OTP_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `Account`(`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permanent_Data` ADD CONSTRAINT `Permanent_Data_ibfk_1` FOREIGN KEY (`device_registrations_ID`) REFERENCES `device_registrations`(`device_registrations_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permanent_Data` ADD CONSTRAINT `Permanent_Data_ibfk_2` FOREIGN KEY (`sensor_type`) REFERENCES `Sensor_Type`(`sensor_type_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User_Settings` ADD CONSTRAINT `User_Settings_ibfk_1` FOREIGN KEY (`device_registrations_ID`) REFERENCES `device_registrations`(`device_registrations_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_registrations` ADD CONSTRAINT `device_registrations_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `Account`(`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_registrations` ADD CONSTRAINT `device_registrations_ibfk_2` FOREIGN KEY (`area_id`) REFERENCES `Area`(`area_id`) ON DELETE CASCADE ON UPDATE CASCADE;
