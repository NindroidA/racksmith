-- CreateTable
CREATE TABLE "BuildPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled plan',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inputs" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildPlan_userId_status_idx" ON "BuildPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "RecommendationDismissal_userId_expiresAt_idx" ON "RecommendationDismissal"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationDismissal_userId_ruleKey_entityKey_key" ON "RecommendationDismissal"("userId", "ruleKey", "entityKey");

-- AddForeignKey
ALTER TABLE "BuildPlan" ADD CONSTRAINT "BuildPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationDismissal" ADD CONSTRAINT "RecommendationDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
