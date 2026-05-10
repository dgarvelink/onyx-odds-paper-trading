-- CreateTable
CREATE TABLE "Parlay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stakeCents" INTEGER NOT NULL,
    "toWinCents" INTEGER NOT NULL,
    "parlayOdds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParlayLeg" (
    "id" TEXT NOT NULL,
    "parlayId" TEXT NOT NULL,
    "game_id" INTEGER NOT NULL,
    "betType" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "line" DOUBLE PRECISION NOT NULL,
    "odds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ParlayLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParlaySettlement" (
    "id" TEXT NOT NULL,
    "parlayId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "payout" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParlaySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParlaySettlement_parlayId_key" ON "ParlaySettlement"("parlayId");

-- AddForeignKey
ALTER TABLE "Parlay" ADD CONSTRAINT "Parlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParlayLeg" ADD CONSTRAINT "ParlayLeg_parlayId_fkey" FOREIGN KEY ("parlayId") REFERENCES "Parlay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParlaySettlement" ADD CONSTRAINT "ParlaySettlement_parlayId_fkey" FOREIGN KEY ("parlayId") REFERENCES "Parlay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
