-- CreateTable
CREATE TABLE "RateLimitFailure" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitFailure_key_failedAt_idx" ON "RateLimitFailure"("key", "failedAt");
