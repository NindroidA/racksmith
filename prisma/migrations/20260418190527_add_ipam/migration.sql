-- CreateTable
CREATE TABLE "Subnet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "gateway" TEXT,
    "dnsServers" TEXT NOT NULL DEFAULT '',
    "colorTag" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subnet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subnetId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "deviceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DhcpRange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subnetId" TEXT NOT NULL,
    "startIp" TEXT NOT NULL,
    "endIp" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DhcpRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subnet_userId_idx" ON "Subnet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subnet_userId_cidr_key" ON "Subnet"("userId", "cidr");

-- CreateIndex
CREATE INDEX "IpAssignment_userId_idx" ON "IpAssignment"("userId");

-- CreateIndex
CREATE INDEX "IpAssignment_subnetId_idx" ON "IpAssignment"("subnetId");

-- CreateIndex
CREATE UNIQUE INDEX "IpAssignment_subnetId_ipAddress_key" ON "IpAssignment"("subnetId", "ipAddress");

-- CreateIndex
CREATE INDEX "DhcpRange_userId_idx" ON "DhcpRange"("userId");

-- CreateIndex
CREATE INDEX "DhcpRange_subnetId_idx" ON "DhcpRange"("subnetId");

-- AddForeignKey
ALTER TABLE "Subnet" ADD CONSTRAINT "Subnet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAssignment" ADD CONSTRAINT "IpAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAssignment" ADD CONSTRAINT "IpAssignment_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAssignment" ADD CONSTRAINT "IpAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DhcpRange" ADD CONSTRAINT "DhcpRange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DhcpRange" ADD CONSTRAINT "DhcpRange_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
