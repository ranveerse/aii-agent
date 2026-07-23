-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "company_name" VARCHAR(120) NOT NULL,
    "current_price" DOUBLE PRECISION,
    "investment_grade" VARCHAR(40),
    "composite_score" INTEGER,
    "adjusted_margin_of_safety_percentage" DOUBLE PRECISION,
    "piotroski_f_score" INTEGER,
    "altman_z_score" DOUBLE PRECISION,
    "roic" DOUBLE PRECISION,
    "wacc" DOUBLE PRECISION,
    "intrinsic_value_per_share" DOUBLE PRECISION,
    "epv_per_share" DOUBLE PRECISION,
    "raw_report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mr_market_readings" (
    "id" SERIAL NOT NULL,
    "as_of" DATE NOT NULL,
    "composite_score" DOUBLE PRECISION NOT NULL,
    "zone" VARCHAR(20) NOT NULL,
    "reading" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mr_market_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_requests" (
    "id" SERIAL NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_ticker_key" ON "reports"("ticker");

-- CreateIndex
CREATE INDEX "reports_investment_grade_idx" ON "reports"("investment_grade");

-- CreateIndex
CREATE INDEX "reports_composite_score_idx" ON "reports"("composite_score");

-- CreateIndex
CREATE UNIQUE INDEX "mr_market_readings_as_of_key" ON "mr_market_readings"("as_of");

-- CreateIndex
CREATE INDEX "stock_requests_ticker_idx" ON "stock_requests"("ticker");
