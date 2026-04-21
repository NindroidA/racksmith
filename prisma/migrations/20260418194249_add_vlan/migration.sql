-- AlterTable
ALTER TABLE "Subnet" ADD COLUMN     "vlanId" TEXT;

-- CreateTable
CREATE TABLE "Vlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vlanId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "colorTag" TEXT NOT NULL DEFAULT 'purple',
    "purpose" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VlanAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vlanId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'access',
    "portNumber" INTEGER,
    "tagged" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vlan_userId_idx" ON "Vlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vlan_userId_vlanId_key" ON "Vlan"("userId", "vlanId");

-- CreateIndex
CREATE INDEX "VlanAssignment_userId_idx" ON "VlanAssignment"("userId");

-- CreateIndex
CREATE INDEX "VlanAssignment_vlanId_idx" ON "VlanAssignment"("vlanId");

-- CreateIndex
CREATE INDEX "VlanAssignment_deviceId_idx" ON "VlanAssignment"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "VlanAssignment_vlanId_deviceId_portNumber_key" ON "VlanAssignment"("vlanId", "deviceId", "portNumber");

-- CreateIndex
CREATE INDEX "Subnet_vlanId_idx" ON "Subnet"("vlanId");

-- AddForeignKey
ALTER TABLE "Subnet" ADD CONSTRAINT "Subnet_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "Vlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vlan" ADD CONSTRAINT "Vlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VlanAssignment" ADD CONSTRAINT "VlanAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VlanAssignment" ADD CONSTRAINT "VlanAssignment_vlanId_fkey" FOREIGN KEY ("vlanId") REFERENCES "Vlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VlanAssignment" ADD CONSTRAINT "VlanAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
