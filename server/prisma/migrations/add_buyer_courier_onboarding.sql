-- Migration: Add Buyer and Courier Onboarding Fields
-- Date: 2025-11-22
-- Purpose: Enable comprehensive onboarding for buyers and couriers with addresses, service areas, and routes

-- ============================================
-- USER TABLE UPDATES
-- ============================================

-- Buyer onboarding fields
ALTER TABLE User ADD COLUMN buyerOnboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE User ADD COLUMN buyerOnboardingStep INTEGER DEFAULT 0;
ALTER TABLE User ADD COLUMN shoppingInterests TEXT; -- JSON array of categories

-- Courier onboarding fields
ALTER TABLE User ADD COLUMN courierOnboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE User ADD COLUMN courierOnboardingStep INTEGER DEFAULT 0;
ALTER TABLE User ADD COLUMN courierVerificationStatus TEXT DEFAULT 'unverified'; -- unverified, basic, standard, premium
ALTER TABLE User ADD COLUMN vehicleType TEXT; -- motorcycle, car, van, bicycle, on_foot
ALTER TABLE User ADD COLUMN vehicleRegistration TEXT;
ALTER TABLE User ADD COLUMN vehicleColor TEXT;
ALTER TABLE User ADD COLUMN vehicleMake TEXT;
ALTER TABLE User ADD COLUMN vehicleModel TEXT;
ALTER TABLE User ADD COLUMN vehicleCapacity REAL; -- Weight capacity in kg
ALTER TABLE User ADD COLUMN governmentIdType TEXT; -- NIN, drivers_license, voters_card, passport
ALTER TABLE User ADD COLUMN governmentIdNumber TEXT;
ALTER TABLE User ADD COLUMN courierRating REAL DEFAULT 5.0;
ALTER TABLE User ADD COLUMN completedDeliveries INTEGER DEFAULT 0;
ALTER TABLE User ADD COLUMN acceptanceRate REAL DEFAULT 100.0;
ALTER TABLE User ADD COLUMN profilePhotoUrl TEXT;
ALTER TABLE User ADD COLUMN profilePhotoPublicId TEXT;

-- Add indexes for buyer fields
CREATE INDEX idx_user_buyer_onboarded ON User(buyerOnboarded);
CREATE INDEX idx_user_buyer_step ON User(buyerOnboardingStep);

-- Add indexes for courier fields
CREATE INDEX idx_user_courier_onboarded ON User(courierOnboarded);
CREATE INDEX idx_user_courier_verification ON User(courierVerificationStatus);
CREATE INDEX idx_user_courier_rating ON User(courierRating);
CREATE INDEX idx_user_vehicle_type ON User(vehicleType);
CREATE INDEX idx_user_role_courier ON User(role) WHERE role = 'courier';

-- ============================================
-- ADDRESS TABLE (for buyer delivery addresses)
-- ============================================

CREATE TABLE Address (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  addressType TEXT DEFAULT 'home', -- home, work, other
  label TEXT, -- User-friendly name like "Home", "Office"
  fullName TEXT NOT NULL, -- Recipient name
  phoneNumber TEXT NOT NULL, -- Recipient phone
  street TEXT NOT NULL,
  apartment TEXT, -- Apartment/Suite/Unit number
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lga TEXT, -- Local Government Area (Nigeria-specific)
  postalCode TEXT,
  landmark TEXT, -- Critical for Nigeria: "Opposite ShopRite", "Near Police Station"
  additionalDirections TEXT, -- "Blue gate, second house on left"
  isDefault BOOLEAN DEFAULT FALSE,
  lat REAL, -- GPS latitude
  lng REAL, -- GPS longitude
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_address_user ON Address(userId);
CREATE INDEX idx_address_default ON Address(userId, isDefault);
CREATE INDEX idx_address_location ON Address(lat, lng);
CREATE INDEX idx_address_city_state ON Address(city, state);

-- ============================================
-- COURIER SERVICE AREA TABLE (zone-based)
-- ============================================

CREATE TABLE CourierServiceArea (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  name TEXT NOT NULL, -- "Ikeja Zone", "VI/Lekki Area"
  state TEXT NOT NULL,
  lgas TEXT, -- JSON array of Local Government Areas: ["Ikeja", "Agege"]
  polygon TEXT, -- GeoJSON polygon for precise boundary
  centerLat REAL, -- Center point of zone
  centerLng REAL,
  maxRadius REAL DEFAULT 10, -- Maximum delivery radius in km
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_service_area_courier ON CourierServiceArea(courierId);
CREATE INDEX idx_service_area_active ON CourierServiceArea(courierId, isActive);
CREATE INDEX idx_service_area_location ON CourierServiceArea(centerLat, centerLng);
CREATE INDEX idx_service_area_state ON CourierServiceArea(state);

-- ============================================
-- COURIER ROUTE TABLE (route-based for transporters)
-- ============================================

CREATE TABLE CourierRoute (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  name TEXT NOT NULL, -- "Lagos-Ibadan Express", "Abuja-Kaduna Route"
  startCity TEXT NOT NULL,
  startState TEXT NOT NULL,
  startLga TEXT,
  startLandmark TEXT,
  startLat REAL,
  startLng REAL,
  endCity TEXT NOT NULL,
  endState TEXT NOT NULL,
  endLga TEXT,
  endLandmark TEXT,
  endLat REAL,
  endLng REAL,
  stopPoints TEXT, -- JSON array of intermediate stops
  frequency TEXT DEFAULT 'daily', -- daily, weekdays, weekends, specific_days
  operatingDays TEXT, -- JSON array: [1,2,3,4,5] = Monday-Friday
  departureTime TEXT, -- "08:00"
  estimatedArrival TEXT, -- "11:00"
  estimatedDuration INTEGER, -- Minutes
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_route_courier ON CourierRoute(courierId);
CREATE INDEX idx_route_active ON CourierRoute(courierId, isActive);
CREATE INDEX idx_route_cities ON CourierRoute(startCity, endCity);
CREATE INDEX idx_route_start_location ON CourierRoute(startLat, startLng);
CREATE INDEX idx_route_end_location ON CourierRoute(endLat, endLng);

-- ============================================
-- COURIER DOCUMENT TABLE (verification)
-- ============================================

CREATE TABLE CourierDocument (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  documentType TEXT NOT NULL, -- government_id, proof_address, vehicle_registration, drivers_license, guarantor_info
  fileUrl TEXT NOT NULL,
  publicId TEXT, -- Cloudinary public ID
  fileName TEXT,
  fileSize INTEGER, -- bytes
  mimeType TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  rejectionReason TEXT,
  verifiedBy TEXT, -- Admin user ID who verified
  verifiedAt DATETIME,
  expiryDate DATE, -- For documents with expiry (license, registration)
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_document_courier ON CourierDocument(courierId);
CREATE INDEX idx_document_type ON CourierDocument(courierId, documentType);
CREATE INDEX idx_document_status ON CourierDocument(status);
CREATE INDEX idx_document_pending ON CourierDocument(status) WHERE status = 'pending';

-- ============================================
-- COURIER AVAILABILITY TABLE (operating hours)
-- ============================================

CREATE TABLE CourierAvailability (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  dayOfWeek INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime TEXT, -- "08:00"
  endTime TEXT, -- "18:00"
  available BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(courierId, dayOfWeek)
);

CREATE INDEX idx_availability_courier ON CourierAvailability(courierId);
CREATE INDEX idx_availability_day ON CourierAvailability(dayOfWeek);
CREATE INDEX idx_availability_active ON CourierAvailability(courierId, available);

-- ============================================
-- COURIER PREFERENCES TABLE
-- ============================================

CREATE TABLE CourierPreferences (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL UNIQUE,
  maxConcurrentDeliveries INTEGER DEFAULT 3,
  maxDistancePerDelivery REAL DEFAULT 15, -- km
  acceptsInterCity BOOLEAN DEFAULT FALSE,
  preferredPackageTypes TEXT, -- JSON array: ["small", "medium"]
  requiresAdvanceNotice BOOLEAN DEFAULT FALSE,
  advanceNoticeHours INTEGER DEFAULT 0,
  minimumEarningPerDelivery REAL DEFAULT 500, -- NGN
  preferredPaymentMethod TEXT DEFAULT 'bank_transfer', -- bank_transfer, wallet, cash
  acceptsCOD BOOLEAN DEFAULT TRUE,
  maxCODAmount REAL DEFAULT 50000, -- Maximum Cash on Delivery amount in NGN
  preferredAreas TEXT, -- JSON array of preferred pickup areas
  blockedAreas TEXT, -- JSON array of areas courier won't service
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_preferences_courier ON CourierPreferences(courierId);
CREATE INDEX idx_preferences_intercity ON CourierPreferences(acceptsInterCity);

-- ============================================
-- GUARANTOR TABLE (for courier verification)
-- ============================================

CREATE TABLE CourierGuarantor (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  phoneNumber TEXT NOT NULL,
  email TEXT,
  relationship TEXT, -- friend, family, colleague, employer
  address TEXT,
  occupation TEXT,
  verificationStatus TEXT DEFAULT 'pending', -- pending, contacted, verified, failed
  verifiedAt DATETIME,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_guarantor_courier ON CourierGuarantor(courierId);
CREATE INDEX idx_guarantor_status ON CourierGuarantor(verificationStatus);

-- ============================================
-- PAYMENT METHOD TABLE (for buyers)
-- ============================================

CREATE TABLE PaymentMethod (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL, -- card, bank_account, wallet
  provider TEXT, -- stripe, flutterwave
  last4 TEXT, -- Last 4 digits of card/account
  brand TEXT, -- visa, mastercard, verve
  expiryMonth INTEGER,
  expiryYear INTEGER,
  holderName TEXT,
  isDefault BOOLEAN DEFAULT FALSE,
  stripePaymentMethodId TEXT,
  flutterwaveToken TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_method_user ON PaymentMethod(userId);
CREATE INDEX idx_payment_method_default ON PaymentMethod(userId, isDefault);

-- ============================================
-- COURIER ASSIGNMENT LOG (for analytics)
-- ============================================

CREATE TABLE CourierAssignmentLog (
  id TEXT PRIMARY KEY,
  deliveryId TEXT NOT NULL,
  courierId TEXT NOT NULL,
  assignmentType TEXT, -- auto, manual, accepted
  score REAL, -- Assignment score (0-100)
  distanceFromPickup REAL, -- km
  courierRating REAL,
  courierWorkload INTEGER,
  accepted BOOLEAN DEFAULT FALSE,
  acceptedAt DATETIME,
  rejectedAt DATETIME,
  rejectionReason TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deliveryId) REFERENCES Delivery(id) ON DELETE CASCADE,
  FOREIGN KEY (courierId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_assignment_log_delivery ON CourierAssignmentLog(deliveryId);
CREATE INDEX idx_assignment_log_courier ON CourierAssignmentLog(courierId);
CREATE INDEX idx_assignment_log_accepted ON CourierAssignmentLog(accepted);
CREATE INDEX idx_assignment_log_created ON CourierAssignmentLog(createdAt);
