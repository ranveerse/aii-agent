-- CreateTable
CREATE TABLE `stock_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticker` VARCHAR(10) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_requests_ticker_idx`(`ticker`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
