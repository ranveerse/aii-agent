-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticker` VARCHAR(10) NOT NULL,
    `company_name` VARCHAR(120) NOT NULL,
    `current_price` DOUBLE NULL,
    `investment_grade` VARCHAR(40) NULL,
    `composite_score` INTEGER NULL,
    `adjusted_margin_of_safety_percentage` DOUBLE NULL,
    `piotroski_f_score` INTEGER NULL,
    `altman_z_score` DOUBLE NULL,
    `roic` DOUBLE NULL,
    `wacc` DOUBLE NULL,
    `intrinsic_value_per_share` DOUBLE NULL,
    `epv_per_share` DOUBLE NULL,
    `raw_report` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reports_ticker_key`(`ticker`),
    INDEX `reports_investment_grade_idx`(`investment_grade`),
    INDEX `reports_composite_score_idx`(`composite_score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mr_market_readings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `as_of` DATE NOT NULL,
    `composite_score` DOUBLE NOT NULL,
    `zone` VARCHAR(20) NOT NULL,
    `reading` TEXT NOT NULL,
    `components` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mr_market_readings_as_of_key`(`as_of`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
