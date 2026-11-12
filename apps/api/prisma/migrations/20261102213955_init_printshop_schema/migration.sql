-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PLA', 'PETG', 'ABS', 'TPU', 'ASA');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('QUEUED', 'SLICING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID_QUEUED', 'PRINTING', 'POST_PROCESSING', 'SHIPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "materialType" "MaterialType" NOT NULL,
    "colorHex" TEXT NOT NULL,
    "pricePerGram" DECIMAL(10,4) NOT NULL,
    "densityGPerCm3" DOUBLE PRECISION NOT NULL DEFAULT 1.24,
    "nozzleTempC" INTEGER NOT NULL DEFAULT 210,
    "bedTempC" INTEGER NOT NULL DEFAULT 60,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "spoolWeightG" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogModel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stlFilePath" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "estimatedWeightG" DOUBLE PRECISION NOT NULL,
    "estimatedTimeSec" INTEGER NOT NULL,
    "dimensionsMm" JSONB NOT NULL,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "stlFilePath" TEXT NOT NULL,
    "gcodeFilePath" TEXT,
    "filamentId" TEXT NOT NULL,
    "layerHeightMm" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "infillPercentage" INTEGER NOT NULL DEFAULT 20,
    "supportsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scalePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "dimensionsMm" JSONB,
    "bullMqJobId" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "estimatedWeightG" DOUBLE PRECISION,
    "estimatedLengthMm" DOUBLE PRECISION,
    "estimatedTimeSec" INTEGER,
    "calculatedPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CustomQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogModelId" TEXT,
    "customQuoteId" TEXT,
    "filamentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogModel_slug_key" ON "CatalogModel"("slug");

-- CreateIndex
CREATE INDEX "CatalogModel_popularityScore_idx" ON "CatalogModel"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX "CatalogModel_category_idx" ON "CatalogModel"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CustomQuote_bullMqJobId_key" ON "CustomQuote"("bullMqJobId");

-- CreateIndex
CREATE INDEX "CustomQuote_status_idx" ON "CustomQuote"("status");

-- CreateIndex
CREATE INDEX "CustomQuote_userId_idx" ON "CustomQuote"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- AddForeignKey
ALTER TABLE "CustomQuote" ADD CONSTRAINT "CustomQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomQuote" ADD CONSTRAINT "CustomQuote_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "CatalogModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_customQuoteId_fkey" FOREIGN KEY ("customQuoteId") REFERENCES "CustomQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
