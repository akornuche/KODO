-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "addressType" TEXT NOT NULL DEFAULT 'home',
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "postalCode" TEXT,
    "landmark" TEXT,
    "additionalDirections" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierServiceArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lgas" TEXT,
    "polygon" TEXT,
    "centerLat" REAL,
    "centerLng" REAL,
    "maxRadius" REAL NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierServiceArea_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startCity" TEXT NOT NULL,
    "startState" TEXT NOT NULL,
    "startLga" TEXT,
    "startLandmark" TEXT,
    "startLat" REAL,
    "startLng" REAL,
    "endCity" TEXT NOT NULL,
    "endState" TEXT NOT NULL,
    "endLga" TEXT,
    "endLandmark" TEXT,
    "endLat" REAL,
    "endLng" REAL,
    "stopPoints" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "operatingDays" TEXT,
    "departureTime" TEXT,
    "estimatedArrival" TEXT,
    "estimatedDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierRoute_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierDocument_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierAvailability_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "maxConcurrentDeliveries" INTEGER NOT NULL DEFAULT 3,
    "maxDistancePerDelivery" REAL NOT NULL DEFAULT 15,
    "acceptsInterCity" BOOLEAN NOT NULL DEFAULT false,
    "preferredPackageTypes" TEXT,
    "requiresAdvanceNotice" BOOLEAN NOT NULL DEFAULT false,
    "advanceNoticeHours" INTEGER NOT NULL DEFAULT 0,
    "minimumEarningPerDelivery" REAL NOT NULL DEFAULT 500,
    "preferredPaymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "acceptsCOD" BOOLEAN NOT NULL DEFAULT true,
    "maxCODAmount" REAL NOT NULL DEFAULT 50000,
    "preferredAreas" TEXT,
    "blockedAreas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierPreferences_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierGuarantor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courierId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "relationship" TEXT NOT NULL,
    "address" TEXT,
    "occupation" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierGuarantor_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "holderName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentMethodId" TEXT,
    "flutterwaveToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourierAssignmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "assignmentType" TEXT NOT NULL,
    "score" REAL,
    "distanceFromPickup" REAL,
    "courierRating" REAL,
    "courierWorkload" INTEGER,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourierAssignmentLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourierAssignmentLog_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "stripeAccountId" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "bankCode" TEXT,
    "businessName" TEXT,
    "sellerNiche" TEXT,
    "sellerCategories" TEXT,
    "businessDescription" TEXT,
    "businessLogo" TEXT,
    "taxId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sellerOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "buyerOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "buyerOnboardingStep" INTEGER NOT NULL DEFAULT 0,
    "shoppingInterests" TEXT,
    "courierOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "courierOnboardingStep" INTEGER NOT NULL DEFAULT 0,
    "courierVerificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "vehicleType" TEXT,
    "vehicleRegistration" TEXT,
    "vehicleColor" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleCapacity" REAL,
    "governmentIdType" TEXT,
    "governmentIdNumber" TEXT,
    "courierRating" REAL DEFAULT 5.0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" REAL DEFAULT 100.0,
    "profilePhotoUrl" TEXT,
    "profilePhotoPublicId" TEXT,
    "lastKnownLat" REAL,
    "lastKnownLng" REAL,
    "avatarUrl" TEXT,
    "avatarPublicId" TEXT,
    "deviceTokens" JSONB,
    "pushSubscriptions" JSONB,
    "notificationPreferences" JSONB,
    "phoneNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountName", "accountNumber", "avatarPublicId", "avatarUrl", "bankCode", "bankName", "createdAt", "deviceTokens", "email", "id", "lastKnownLat", "lastKnownLng", "notificationPreferences", "password", "phoneNumber", "pushSubscriptions", "role", "stripeAccountId", "updatedAt", "username") SELECT "accountName", "accountNumber", "avatarPublicId", "avatarUrl", "bankCode", "bankName", "createdAt", "deviceTokens", "email", "id", "lastKnownLat", "lastKnownLng", "notificationPreferences", "password", "phoneNumber", "pushSubscriptions", "role", "stripeAccountId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_lastKnownLat_lastKnownLng_idx" ON "User"("lastKnownLat", "lastKnownLng");
CREATE INDEX "User_sellerNiche_idx" ON "User"("sellerNiche");
CREATE INDEX "User_verified_idx" ON "User"("verified");
CREATE INDEX "User_sellerOnboarded_idx" ON "User"("sellerOnboarded");
CREATE INDEX "User_buyerOnboarded_idx" ON "User"("buyerOnboarded");
CREATE INDEX "User_courierOnboarded_idx" ON "User"("courierOnboarded");
CREATE INDEX "User_courierVerificationStatus_idx" ON "User"("courierVerificationStatus");
CREATE INDEX "User_courierRating_idx" ON "User"("courierRating");
CREATE INDEX "User_vehicleType_idx" ON "User"("vehicleType");
CREATE INDEX "User_role_sellerNiche_idx" ON "User"("role", "sellerNiche");
CREATE INDEX "User_role_verified_idx" ON "User"("role", "verified");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "Address_lat_lng_idx" ON "Address"("lat", "lng");

-- CreateIndex
CREATE INDEX "Address_city_state_idx" ON "Address"("city", "state");

-- CreateIndex
CREATE INDEX "CourierServiceArea_courierId_idx" ON "CourierServiceArea"("courierId");

-- CreateIndex
CREATE INDEX "CourierServiceArea_courierId_isActive_idx" ON "CourierServiceArea"("courierId", "isActive");

-- CreateIndex
CREATE INDEX "CourierServiceArea_centerLat_centerLng_idx" ON "CourierServiceArea"("centerLat", "centerLng");

-- CreateIndex
CREATE INDEX "CourierServiceArea_state_idx" ON "CourierServiceArea"("state");

-- CreateIndex
CREATE INDEX "CourierRoute_courierId_idx" ON "CourierRoute"("courierId");

-- CreateIndex
CREATE INDEX "CourierRoute_courierId_isActive_idx" ON "CourierRoute"("courierId", "isActive");

-- CreateIndex
CREATE INDEX "CourierRoute_startCity_endCity_idx" ON "CourierRoute"("startCity", "endCity");

-- CreateIndex
CREATE INDEX "CourierRoute_startLat_startLng_idx" ON "CourierRoute"("startLat", "startLng");

-- CreateIndex
CREATE INDEX "CourierRoute_endLat_endLng_idx" ON "CourierRoute"("endLat", "endLng");

-- CreateIndex
CREATE INDEX "CourierDocument_courierId_idx" ON "CourierDocument"("courierId");

-- CreateIndex
CREATE INDEX "CourierDocument_courierId_documentType_idx" ON "CourierDocument"("courierId", "documentType");

-- CreateIndex
CREATE INDEX "CourierDocument_status_idx" ON "CourierDocument"("status");

-- CreateIndex
CREATE INDEX "CourierAvailability_courierId_idx" ON "CourierAvailability"("courierId");

-- CreateIndex
CREATE INDEX "CourierAvailability_dayOfWeek_idx" ON "CourierAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "CourierAvailability_courierId_available_idx" ON "CourierAvailability"("courierId", "available");

-- CreateIndex
CREATE UNIQUE INDEX "CourierAvailability_courierId_dayOfWeek_key" ON "CourierAvailability"("courierId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "CourierPreferences_courierId_key" ON "CourierPreferences"("courierId");

-- CreateIndex
CREATE INDEX "CourierPreferences_courierId_idx" ON "CourierPreferences"("courierId");

-- CreateIndex
CREATE INDEX "CourierPreferences_acceptsInterCity_idx" ON "CourierPreferences"("acceptsInterCity");

-- CreateIndex
CREATE UNIQUE INDEX "CourierGuarantor_courierId_key" ON "CourierGuarantor"("courierId");

-- CreateIndex
CREATE INDEX "CourierGuarantor_courierId_idx" ON "CourierGuarantor"("courierId");

-- CreateIndex
CREATE INDEX "CourierGuarantor_verificationStatus_idx" ON "CourierGuarantor"("verificationStatus");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_isDefault_idx" ON "PaymentMethod"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "CourierAssignmentLog_deliveryId_idx" ON "CourierAssignmentLog"("deliveryId");

-- CreateIndex
CREATE INDEX "CourierAssignmentLog_courierId_idx" ON "CourierAssignmentLog"("courierId");

-- CreateIndex
CREATE INDEX "CourierAssignmentLog_accepted_idx" ON "CourierAssignmentLog"("accepted");

-- CreateIndex
CREATE INDEX "CourierAssignmentLog_createdAt_idx" ON "CourierAssignmentLog"("createdAt");
