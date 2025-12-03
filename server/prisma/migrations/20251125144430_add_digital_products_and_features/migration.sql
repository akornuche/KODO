-- AlterTable
ALTER TABLE "Product" ADD COLUMN "digitalFileName" TEXT;
ALTER TABLE "Product" ADD COLUMN "digitalFileSize" INTEGER;
ALTER TABLE "Product" ADD COLUMN "downloadLimit" INTEGER;
ALTER TABLE "Product" ADD COLUMN "licenseType" TEXT;

-- CreateTable
CREATE TABLE "DigitalDownload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER,
    "expiresAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastDownloadAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductComparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecentlyViewed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReviewPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "publicId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalDownload_downloadToken_key" ON "DigitalDownload"("downloadToken");

-- CreateIndex
CREATE INDEX "DigitalDownload_orderId_idx" ON "DigitalDownload"("orderId");

-- CreateIndex
CREATE INDEX "DigitalDownload_productId_idx" ON "DigitalDownload"("productId");

-- CreateIndex
CREATE INDEX "DigitalDownload_userId_idx" ON "DigitalDownload"("userId");

-- CreateIndex
CREATE INDEX "DigitalDownload_downloadToken_idx" ON "DigitalDownload"("downloadToken");

-- CreateIndex
CREATE INDEX "DigitalDownload_expiresAt_idx" ON "DigitalDownload"("expiresAt");

-- CreateIndex
CREATE INDEX "ProductComparison_userId_idx" ON "ProductComparison"("userId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_userId_idx" ON "RecentlyViewed"("userId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_sessionId_idx" ON "RecentlyViewed"("sessionId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_productId_idx" ON "RecentlyViewed"("productId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_viewedAt_idx" ON "RecentlyViewed"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPhoto_publicId_key" ON "ReviewPhoto"("publicId");

-- CreateIndex
CREATE INDEX "ReviewPhoto_reviewId_idx" ON "ReviewPhoto"("reviewId");
