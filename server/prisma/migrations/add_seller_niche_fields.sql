-- Add niche and seller onboarding fields to User table
-- Migration: Add seller specialization fields

-- Add new columns to User table
ALTER TABLE User ADD COLUMN firstName TEXT;
ALTER TABLE User ADD COLUMN lastName TEXT;
ALTER TABLE User ADD COLUMN businessName TEXT; -- For sellers
ALTER TABLE User ADD COLUMN sellerNiche TEXT; -- Primary niche/category
ALTER TABLE User ADD COLUMN sellerCategories TEXT; -- JSON array of allowed categories
ALTER TABLE User ADD COLUMN businessDescription TEXT; -- Seller bio
ALTER TABLE User ADD COLUMN businessLogo TEXT; -- Logo URL
ALTER TABLE User ADD COLUMN taxId TEXT; -- Tax ID for sellers
ALTER TABLE User ADD COLUMN verified BOOLEAN DEFAULT 0; -- Email/phone verification
ALTER TABLE User ADD COLUMN sellerOnboarded BOOLEAN DEFAULT 0; -- Completed onboarding
ALTER TABLE User ADD COLUMN onboardingStep INTEGER DEFAULT 0; -- Current onboarding step

-- Create indexes for seller queries
CREATE INDEX idx_user_seller_niche ON User(sellerNiche) WHERE role = 'seller';
CREATE INDEX idx_user_verified ON User(verified);
CREATE INDEX idx_user_seller_onboarded ON User(sellerOnboarded) WHERE role = 'seller';
