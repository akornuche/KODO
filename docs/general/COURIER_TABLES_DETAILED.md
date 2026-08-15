# Courier Verification & Preference Tables - Detailed Guide

## Overview

The courier onboarding system uses four specialized tables to ensure quality, safety, and efficient operations:

1. **CourierDocument** - Identity and legal verification
2. **CourierAvailability** - Operating hours and schedule
3. **CourierPreferences** - Delivery preferences and limits
4. **CourierGuarantor** - Reference person for security

---

## 1. CourierDocument Table

### Purpose
Stores all verification documents uploaded by couriers. Used for identity verification, legal compliance, and building trust in the platform.

### Schema
```sql
CREATE TABLE CourierDocument (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  documentType TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  publicId TEXT,              -- Cloudinary public ID for file management
  fileName TEXT,
  fileSize INTEGER,           -- In bytes
  mimeType TEXT,              -- image/jpeg, application/pdf, etc.
  status TEXT DEFAULT 'pending',
  rejectionReason TEXT,       -- Why document was rejected
  verifiedBy TEXT,            -- Admin user ID who approved/rejected
  verifiedAt DATETIME,        -- Timestamp of verification
  expiryDate DATE,            -- For documents that expire (license, etc.)
  notes TEXT,                 -- Admin notes
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### Document Types (6 types)

#### 1. **government_id** (REQUIRED)
**Purpose**: Verify courier's identity  
**Accepted**: NIN, Driver's License, Voter's Card, International Passport  
**Example Use Case**:
```javascript
{
  documentType: "government_id",
  fileUrl: "https://res.cloudinary.com/kodo/image/upload/v1/nin_12345.jpg",
  publicId: "courier_docs/nin_12345",
  fileName: "my_nin_card.jpg",
  fileSize: 245678,
  mimeType: "image/jpeg",
  status: "pending"
}
```

#### 2. **proof_address** (REQUIRED)
**Purpose**: Verify courier's residential address  
**Accepted**: Utility bill (NEPA, water), Bank statement, Tenancy agreement  
**Must be**: Last 3 months  
**Example**:
```javascript
{
  documentType: "proof_address",
  fileUrl: "https://res.cloudinary.com/kodo/upload/v1/utility_bill.pdf",
  fileName: "nepa_bill_oct_2025.pdf",
  notes: "Electricity bill from October 2025"
}
```

#### 3. **vehicle_registration** (REQUIRED for motorized vehicles)
**Purpose**: Verify vehicle ownership and legality  
**Required for**: Motorcycle, Car, Van  
**Not required for**: Bicycle, On foot  
**Has expiry date**:
```javascript
{
  documentType: "vehicle_registration",
  fileUrl: "https://cloudinary.com/kodo/vehicle_reg_ABC123.jpg",
  expiryDate: "2026-12-31",  // Vehicle papers expire
  status: "approved",
  verifiedAt: "2025-11-20T10:30:00Z"
}
```

#### 4. **drivers_license** (REQUIRED for motorized vehicles)
**Purpose**: Verify courier can legally operate vehicle  
**Required for**: Motorcycle, Car, Van  
**Has expiry date**:
```javascript
{
  documentType: "drivers_license",
  fileUrl: "https://cloudinary.com/kodo/license_XYZ789.jpg",
  expiryDate: "2028-06-15",  // License expiration
  status: "approved"
}
```

#### 5. **guarantor_info** (OPTIONAL but recommended)
**Purpose**: Additional reference documentation  
**Could be**: Guarantor's ID copy, Signed guarantor form  
```javascript
{
  documentType: "guarantor_info",
  fileUrl: "https://cloudinary.com/kodo/guarantor_form.pdf",
  notes: "Signed guarantor declaration form"
}
```

#### 6. **profile_photo** (REQUIRED)
**Purpose**: Facial recognition, buyer/seller confidence  
**Requirements**: Clear face photo, good lighting  
**Used for**: Delivery confirmation, safety  
```javascript
{
  documentType: "profile_photo",
  fileUrl: "https://cloudinary.com/kodo/profile_abc.jpg",
  mimeType: "image/jpeg",
  status: "approved"
}
```

### Status Workflow

```
pending → approved ✓
        → rejected ✗
```

**Status Values**:
- `pending`: Just uploaded, awaiting admin review
- `approved`: Admin verified document is valid
- `rejected`: Document rejected (see rejectionReason)

**Rejection Reasons** (examples):
- "Image is blurry, please upload clearer photo"
- "Document has expired"
- "Name on document doesn't match registration"
- "Document is not a valid government ID"

### Usage in Code

**Upload Document**:
```javascript
POST /api/courier-onboarding/document
{
  "documentType": "government_id",
  "fileUrl": "https://cloudinary.com/...",
  "publicId": "courier_docs/nin_12345",
  "fileName": "my_nin.jpg",
  "fileSize": 245678,
  "mimeType": "image/jpeg",
  "expiryDate": null  // No expiry for NIN
}
```

**Check Required Documents**:
```javascript
// Minimum 2 approved documents required to complete onboarding
const approvedDocs = await prisma.courierDocument.findMany({
  where: {
    courierId: userId,
    status: 'approved'
  }
});

if (approvedDocs.length < 2) {
  return "Upload at least 2 verified documents";
}
```

### Admin Verification Interface (Future)
```javascript
// Admin approves document
PUT /api/admin/courier-documents/:id/approve
{
  "verifiedBy": "admin_user_id",
  "notes": "Document verified successfully"
}

// Admin rejects document
PUT /api/admin/courier-documents/:id/reject
{
  "verifiedBy": "admin_user_id",
  "rejectionReason": "Image is blurry, please re-upload"
}
```

---

## 2. CourierAvailability Table

### Purpose
Stores courier's operating hours for each day of the week. Used by the assignment algorithm to avoid assigning deliveries when courier is unavailable.

### Schema
```sql
CREATE TABLE CourierAvailability (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL,
  dayOfWeek INTEGER NOT NULL,  -- 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime TEXT,              -- "08:00"
  endTime TEXT,                -- "18:00"
  available BOOLEAN,           -- Can work on this day?
  createdAt DATETIME,
  updatedAt DATETIME,
  UNIQUE(courierId, dayOfWeek) -- One record per day per courier
);
```

### Day of Week Convention
```javascript
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

### Example Data

**Full-time courier (Mon-Sat)**:
```javascript
[
  { dayOfWeek: 0, startTime: null, endTime: null, available: false },  // Sunday OFF
  { dayOfWeek: 1, startTime: "08:00", endTime: "18:00", available: true },  // Monday
  { dayOfWeek: 2, startTime: "08:00", endTime: "18:00", available: true },  // Tuesday
  { dayOfWeek: 3, startTime: "08:00", endTime: "18:00", available: true },  // Wednesday
  { dayOfWeek: 4, startTime: "08:00", endTime: "18:00", available: true },  // Thursday
  { dayOfWeek: 5, startTime: "08:00", endTime: "18:00", available: true },  // Friday
  { dayOfWeek: 6, startTime: "09:00", endTime: "14:00", available: true }   // Saturday (half day)
]
```

**Part-time courier (evenings only)**:
```javascript
[
  { dayOfWeek: 0, available: false },
  { dayOfWeek: 1, startTime: "17:00", endTime: "21:00", available: true },
  { dayOfWeek: 2, startTime: "17:00", endTime: "21:00", available: true },
  { dayOfWeek: 3, startTime: "17:00", endTime: "21:00", available: true },
  { dayOfWeek: 4, startTime: "17:00", endTime: "21:00", available: true },
  { dayOfWeek: 5, startTime: "17:00", endTime: "21:00", available: true },
  { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", available: true }  // Saturday full day
]
```

**Weekend warrior (weekends only)**:
```javascript
[
  { dayOfWeek: 0, startTime: "10:00", endTime: "18:00", available: true },  // Sunday
  { dayOfWeek: 1, available: false },  // Mon-Fri OFF
  { dayOfWeek: 2, available: false },
  { dayOfWeek: 3, available: false },
  { dayOfWeek: 4, available: false },
  { dayOfWeek: 5, available: false },
  { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", available: true }   // Saturday
]
```

### Usage in Code

**Set Availability**:
```javascript
POST /api/courier-onboarding/availability
{
  "schedule": [
    { "dayOfWeek": 0, "startTime": null, "endTime": null, "available": false },
    { "dayOfWeek": 1, "startTime": "08:00", "endTime": "18:00", "available": true },
    // ... rest of week
  ]
}
```

**Check if Courier Available Now**:
```javascript
const now = new Date();
const dayOfWeek = now.getDay();  // 0-6
const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

const todayAvailability = await prisma.courierAvailability.findFirst({
  where: {
    courierId: courier.id,
    dayOfWeek: dayOfWeek
  }
});

if (!todayAvailability || !todayAvailability.available) {
  return "Courier not working today";
}

if (currentTime < todayAvailability.startTime || currentTime > todayAvailability.endTime) {
  return "Courier outside operating hours";
}

return "Courier available!";
```

**Assignment Algorithm Uses This**:
```javascript
// In courierAssignmentEngine.js
filterAvailableCouriers(couriers) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = "14:30";  // Example: 2:30 PM
  
  return couriers.filter(courier => {
    const todaySchedule = courier.availability.find(a => a.dayOfWeek === dayOfWeek);
    
    // Not working today
    if (!todaySchedule || !todaySchedule.available) {
      return false;
    }
    
    // Outside operating hours
    if (currentTime < todaySchedule.startTime || currentTime > todaySchedule.endTime) {
      return false;
    }
    
    return true;
  });
}
```

---

## 3. CourierPreferences Table

### Purpose
Stores courier's delivery preferences and operational limits. Used to filter assignments and ensure courier satisfaction.

### Schema
```sql
CREATE TABLE CourierPreferences (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL UNIQUE,  -- One preference record per courier
  
  -- Workload Management
  maxConcurrentDeliveries INTEGER DEFAULT 3,     -- How many orders at once
  maxDistancePerDelivery REAL DEFAULT 15,        -- Max km per delivery
  acceptsInterCity BOOLEAN DEFAULT FALSE,        -- Long-distance deliveries
  
  -- Package Preferences
  preferredPackageTypes TEXT,                    -- JSON: ["small", "medium"]
  
  -- Scheduling
  requiresAdvanceNotice BOOLEAN DEFAULT FALSE,   -- Same-day vs scheduled
  advanceNoticeHours INTEGER DEFAULT 0,          -- Hours needed before pickup
  
  -- Earnings
  minimumEarningPerDelivery REAL DEFAULT 500,    -- NGN
  preferredPaymentMethod TEXT DEFAULT 'bank_transfer',
  
  -- Cash on Delivery (COD)
  acceptsCOD BOOLEAN DEFAULT TRUE,
  maxCODAmount REAL DEFAULT 50000,               -- Max NGN for COD orders
  
  -- Area Preferences
  preferredAreas TEXT,                           -- JSON: ["Ikeja", "Yaba"]
  blockedAreas TEXT,                             -- JSON: ["Badagry"]
  
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### Field Details

#### 1. **maxConcurrentDeliveries** (Default: 3)
**Purpose**: Prevent courier burnout  
**Examples**:
- Motorcycle: 3 deliveries (small packages)
- Car: 5 deliveries (can handle more)
- Bicycle: 2 deliveries (limited capacity)
- On foot: 1 delivery (walking)

**Usage**:
```javascript
const activeDeliveries = await prisma.delivery.count({
  where: {
    courierId: courier.id,
    status: { in: ['assigned', 'in_transit'] }
  }
});

if (activeDeliveries >= courier.preferences.maxConcurrentDeliveries) {
  return "Courier at capacity";
}
```

#### 2. **maxDistancePerDelivery** (Default: 15km)
**Purpose**: Courier comfort zone  
**Examples**:
- Local courier: 10km (stays in neighborhood)
- City courier: 20km (covers whole city)
- Suburb courier: 30km (willing to go farther)

**Usage**:
```javascript
const distance = calculateDistance(courier.location, pickup.location);

if (distance > courier.preferences.maxDistancePerDelivery) {
  return "Delivery too far for courier";
}
```

#### 3. **acceptsInterCity** (Default: false)
**Purpose**: Differentiate local vs long-distance couriers  
**Inter-city**: Lagos → Ibadan, Abuja → Kaduna, etc.  
**Example**:
```javascript
{
  acceptsInterCity: true,  // Transporter willing to travel between cities
  maxDistancePerDelivery: 200  // Can do 200km deliveries
}
```

#### 4. **preferredPackageTypes** (JSON array)
**Purpose**: Match courier vehicle to package size  
**Values**: `small`, `medium`, `large`, `xlarge`, `fragile`

**Examples**:
```javascript
// Motorcycle courier
{
  preferredPackageTypes: ["small", "medium"]  // Can't carry large items
}

// Van courier
{
  preferredPackageTypes: ["medium", "large", "xlarge"]  // Specializes in big items
}

// Bicycle courier
{
  preferredPackageTypes: ["small", "fragile"]  // Careful with delicate items
}
```

#### 5. **requiresAdvanceNotice** & **advanceNoticeHours**
**Purpose**: Some couriers need scheduling, not on-demand  
**Example**:
```javascript
// On-demand courier (immediate)
{
  requiresAdvanceNotice: false,
  advanceNoticeHours: 0
}

// Scheduled courier (needs 2 hours)
{
  requiresAdvanceNotice: true,
  advanceNoticeHours: 2  // Book 2 hours in advance
}

// Next-day courier
{
  requiresAdvanceNotice: true,
  advanceNoticeHours: 24  // Book 1 day ahead
}
```

#### 6. **minimumEarningPerDelivery** (Default: 500 NGN)
**Purpose**: Ensure courier earns enough  
**Examples**:
- Student part-timer: 300 NGN (low minimum)
- Professional courier: 1000 NGN (higher minimum)
- Premium courier: 2000 NGN (only high-value deliveries)

**Usage**:
```javascript
if (delivery.courierFee < courier.preferences.minimumEarningPerDelivery) {
  return "Delivery fee below courier's minimum";
}
```

#### 7. **preferredPaymentMethod**
**Purpose**: How courier wants to be paid  
**Values**:
- `bank_transfer`: Direct bank deposit (most common)
- `wallet`: In-app wallet credit
- `cash`: Cash payment on collection

#### 8. **acceptsCOD** & **maxCODAmount**
**Purpose**: Risk management for Cash on Delivery orders  
**Why limit**: Couriers might not want to carry large amounts of cash

**Examples**:
```javascript
// Conservative courier
{
  acceptsCOD: true,
  maxCODAmount: 20000  // Won't handle >20k NGN in cash
}

// Experienced courier
{
  acceptsCOD: true,
  maxCODAmount: 100000  // Can handle large COD orders
}

// Digital-only courier
{
  acceptsCOD: false,  // Only prepaid deliveries
  maxCODAmount: 0
}
```

**Usage**:
```javascript
if (order.paymentMethod === 'cash_on_delivery') {
  if (!courier.preferences.acceptsCOD) {
    return "Courier doesn't accept COD";
  }
  
  if (order.totalAmount > courier.preferences.maxCODAmount) {
    return "COD amount exceeds courier's limit";
  }
}
```

#### 9. **preferredAreas** & **blockedAreas** (JSON arrays)
**Purpose**: Courier knows certain areas well, avoids others  
**Examples**:
```javascript
// Courier familiar with specific areas
{
  preferredAreas: ["Ikeja", "Yaba", "Surulere"],  // Priority in these areas
  blockedAreas: ["Badagry", "Epe"]  // Won't deliver here (too far, traffic, etc.)
}

// Courier with no restrictions
{
  preferredAreas: null,  // Will go anywhere
  blockedAreas: null
}
```

**Usage in Assignment**:
```javascript
// Check if delivery pickup is in blocked area
if (courier.preferences.blockedAreas) {
  const blocked = JSON.parse(courier.preferences.blockedAreas);
  if (blocked.includes(delivery.pickupArea)) {
    return "Delivery in courier's blocked area";
  }
}

// Boost score if in preferred area
if (courier.preferences.preferredAreas) {
  const preferred = JSON.parse(courier.preferences.preferredAreas);
  if (preferred.includes(delivery.pickupArea)) {
    score += 10;  // Bonus points for preferred area
  }
}
```

### Complete Example

**Motorcycle courier in Lagos (full-time)**:
```javascript
{
  maxConcurrentDeliveries: 4,
  maxDistancePerDelivery: 12,  // 12km radius
  acceptsInterCity: false,  // Local only
  preferredPackageTypes: ["small", "medium"],
  requiresAdvanceNotice: false,  // On-demand
  advanceNoticeHours: 0,
  minimumEarningPerDelivery: 800,  // 800 NGN minimum
  preferredPaymentMethod: "bank_transfer",
  acceptsCOD: true,
  maxCODAmount: 50000,  // Up to 50k NGN
  preferredAreas: ["Ikeja", "Ojota", "Maryland", "Yaba"],
  blockedAreas: ["Lekki", "Ajah"]  // Traffic nightmares
}
```

**Van transporter (inter-city)**:
```javascript
{
  maxConcurrentDeliveries: 2,  // Only 2 at a time (long distance)
  maxDistancePerDelivery: 300,  // Up to 300km
  acceptsInterCity: true,  // Inter-city specialist
  preferredPackageTypes: ["medium", "large", "xlarge"],
  requiresAdvanceNotice: true,
  advanceNoticeHours: 12,  // Book 12 hours ahead
  minimumEarningPerDelivery: 5000,  // 5000 NGN minimum (long distance)
  preferredPaymentMethod: "bank_transfer",
  acceptsCOD: true,
  maxCODAmount: 200000,  // Can handle large COD
  preferredAreas: null,  // No specific preferences
  blockedAreas: null
}
```

---

## 4. CourierGuarantor Table

### Purpose
Stores information about courier's guarantor (reference person). Used for security, trust, and recourse in case of issues.

### Schema
```sql
CREATE TABLE CourierGuarantor (
  id TEXT PRIMARY KEY,
  courierId TEXT NOT NULL UNIQUE,  -- One guarantor per courier
  fullName TEXT NOT NULL,
  phoneNumber TEXT NOT NULL,
  email TEXT,
  relationship TEXT,              -- friend, family, colleague, employer
  address TEXT,
  occupation TEXT,
  verificationStatus TEXT DEFAULT 'pending',  -- pending, contacted, verified, failed
  verifiedAt DATETIME,
  notes TEXT,                     -- Admin notes after contacting guarantor
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### Why Guarantor is Important

1. **Security**: Someone to vouch for courier's character
2. **Accountability**: Alternative contact if courier unreachable
3. **Trust Building**: Shows courier is serious and has references
4. **Nigerian Context**: Guarantor system is culturally familiar
5. **Recourse**: In case of theft, damage, or fraud

### Relationship Types

```javascript
const validRelationships = [
  'friend',      // Close friend who knows courier well
  'family',      // Family member (parent, sibling, spouse)
  'colleague',   // Co-worker or professional contact
  'employer',    // Current or former boss
  'mentor',      // Teacher, pastor, community leader
  'neighbor'     // Long-time neighbor
];
```

### Verification Workflow

```
pending → contacted → verified ✓
                    → failed ✗
```

**Status Values**:
- `pending`: Guarantor info provided, not yet contacted
- `contacted`: Admin called guarantor, awaiting response
- `verified`: Guarantor confirmed they know courier and vouch for them
- `failed`: Guarantor doesn't know courier, wrong number, or refused to vouch

### Example Data

**Family guarantor (most common)**:
```javascript
{
  fullName: "Chukwuma Okonkwo",
  phoneNumber: "+2348012345678",
  email: "chukwuma@email.com",
  relationship: "family",  // Brother
  address: "15 Ajose Street, Surulere, Lagos",
  occupation: "Teacher",
  verificationStatus: "verified",
  verifiedAt: "2025-11-18T14:30:00Z",
  notes: "Confirmed via phone call. Brother of courier. Very supportive. Teacher at Government Secondary School."
}
```

**Employer guarantor (strong reference)**:
```javascript
{
  fullName: "Mrs. Adeyemi Balogun",
  phoneNumber: "+2347098765432",
  email: "adeyemi@logistics.com",
  relationship: "employer",  // Former boss
  address: "Swift Logistics, 42 Marina, Lagos Island",
  occupation: "Logistics Manager",
  verificationStatus: "verified",
  notes: "Former employer. Courier worked there for 2 years. Excellent record. Left on good terms."
}
```

**Friend guarantor (acceptable)**:
```javascript
{
  fullName: "Ibrahim Musa",
  phoneNumber: "+2348123456789",
  email: null,
  relationship: "friend",  // Long-time friend
  address: "23 Allen Avenue, Ikeja",
  occupation: "Trader",
  verificationStatus: "contacted",
  notes: "Guarantor contacted. Knows courier for 5 years. Will call back to confirm."
}
```

### Verification Process (Admin Side)

**Step 1: Admin reviews guarantor info**
```javascript
GET /api/admin/guarantors/pending

// Returns list of unverified guarantors
[
  {
    courierId: "courier_123",
    courierName: "John Doe",
    guarantorName: "Chukwuma Okonkwo",
    guarantorPhone: "+2348012345678",
    relationship: "family",
    status: "pending"
  }
]
```

**Step 2: Admin calls guarantor**
```
Admin: "Hello, is this Chukwuma?"
Guarantor: "Yes"
Admin: "I'm calling from KODO Marketplace. A John Doe listed you as a guarantor. Do you know him?"
Guarantor: "Yes, that's my brother."
Admin: "Can you vouch for his character and trustworthiness?"
Guarantor: "Yes, absolutely. He's reliable."
```

**Step 3: Admin updates status**
```javascript
PUT /api/admin/guarantors/:id/verify
{
  "verificationStatus": "verified",
  "notes": "Guarantor confirmed via phone. Positive reference. Brother of courier."
}
```

### Failed Verification Examples

**Reason 1: Wrong number**
```javascript
{
  verificationStatus: "failed",
  notes: "Phone number invalid. Tried multiple times, number not reachable."
}
```

**Reason 2: Doesn't know courier**
```javascript
{
  verificationStatus: "failed",
  notes: "Guarantor claimed not to know the courier. Possible fake reference."
}
```

**Reason 3: Refused to vouch**
```javascript
{
  verificationStatus: "failed",
  notes: "Guarantor knows courier but refused to vouch. Said they had issues in the past."
}
```

### Usage in Courier Verification

Guarantor verification is **optional but highly recommended** for upgrading to **standard verification**:

```javascript
// Check courier's verification eligibility
async function canUpgradeToStandard(courierId) {
  const guarantor = await prisma.courierGuarantor.findUnique({
    where: { courierId }
  });
  
  // Bonus: If guarantor is verified
  if (guarantor && guarantor.verificationStatus === 'verified') {
    return true;  // Can upgrade to standard
  }
  
  // Still allow without guarantor, but lower trust score
  return false;
}
```

### What Happens if Courier Causes Issues?

**Scenario**: Courier steals package

**Actions**:
1. Admin contacts guarantor
2. Guarantor pressured to help locate courier
3. Guarantor's reputation affected
4. Legal recourse through guarantor

**Example**:
```javascript
// In case of incident
async function handleIncident(courierId, incidentType) {
  const guarantor = await prisma.courierGuarantor.findUnique({
    where: { courierId }
  });
  
  if (guarantor) {
    // Send notification to guarantor
    await sendSMS(guarantor.phoneNumber, `
      URGENT: ${courier.name} (whom you guaranteed) has been involved in a delivery incident.
      Please contact us immediately at support@kodo.com or +234-XXX-XXXX.
    `);
    
    // Log incident with guarantor info
    await logIncident({
      courierId,
      guarantorId: guarantor.id,
      guarantorName: guarantor.fullName,
      guarantorPhone: guarantor.phoneNumber
    });
  }
}
```

---

## How These Tables Work Together

### Complete Courier Onboarding Flow

```javascript
// Step 1: Personal info (includes vehicle)
POST /api/courier-onboarding/personal-info
{
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "+2348012345678",
  vehicleType: "motorcycle",
  governmentIdType: "NIN"
}

// Step 2: Service area
POST /api/courier-onboarding/service-area
{
  name: "Ikeja Zone",
  state: "Lagos State",
  lgas: ["Ikeja", "Ojota", "Maryland"]
}

// Step 3A: Upload documents
POST /api/courier-onboarding/document
{
  documentType: "government_id",
  fileUrl: "https://cloudinary.com/nin.jpg"
}

POST /api/courier-onboarding/document
{
  documentType: "profile_photo",
  fileUrl: "https://cloudinary.com/photo.jpg"
}

// Step 3B: Add guarantor
POST /api/courier-onboarding/guarantor
{
  fullName: "Chukwuma Okonkwo",
  phoneNumber: "+2348098765432",
  relationship: "family",
  occupation: "Teacher"
}

// Step 4A: Set availability
POST /api/courier-onboarding/availability
{
  schedule: [
    { dayOfWeek: 1, startTime: "08:00", endTime: "18:00", available: true },
    { dayOfWeek: 2, startTime: "08:00", endTime: "18:00", available: true },
    // ... rest of week
  ]
}

// Step 4B: Set preferences
POST /api/courier-onboarding/preferences
{
  maxConcurrentDeliveries: 3,
  maxDistancePerDelivery: 15,
  acceptsInterCity: false,
  acceptsCOD: true,
  maxCODAmount: 50000,
  preferredAreas: ["Ikeja", "Yaba"]
}

// Step 5: Complete onboarding
POST /api/courier-onboarding/complete
// Returns: { courierVerificationStatus: "basic" }
```

### Assignment Algorithm Uses All Tables

```javascript
// When assigning delivery
async function assignBestCourier(delivery) {
  // 1. Get couriers in area
  const couriers = await getCouriersInArea(delivery.pickupLocation);
  
  // 2. Filter by AVAILABILITY (CourierAvailability table)
  const availableNow = couriers.filter(c => {
    const today = c.availability.find(a => a.dayOfWeek === new Date().getDay());
    return today && today.available && isWithinHours(today.startTime, today.endTime);
  });
  
  // 3. Filter by PREFERENCES (CourierPreferences table)
  const matching = availableNow.filter(c => {
    const prefs = c.preferences;
    
    // Check concurrent deliveries limit
    if (c.activeDeliveries >= prefs.maxConcurrentDeliveries) return false;
    
    // Check distance limit
    const distance = calculateDistance(c.location, delivery.pickupLocation);
    if (distance > prefs.maxDistancePerDelivery) return false;
    
    // Check COD acceptance
    if (delivery.isCOD && !prefs.acceptsCOD) return false;
    if (delivery.isCOD && delivery.amount > prefs.maxCODAmount) return false;
    
    // Check blocked areas
    if (prefs.blockedAreas && prefs.blockedAreas.includes(delivery.pickupArea)) return false;
    
    return true;
  });
  
  // 4. Filter by VERIFICATION (CourierDocument table)
  const verified = matching.filter(c => {
    return c.courierVerificationStatus in ['basic', 'standard', 'premium'];
  });
  
  // 5. Score and select best
  const scored = verified.map(c => ({
    courier: c,
    score: calculateScore(c, delivery)
  }));
  
  return scored.sort((a, b) => b.score - a.score)[0];
}
```

---

## Summary

| Table | Purpose | Key Fields | Required |
|-------|---------|------------|----------|
| **CourierDocument** | Identity verification | documentType, fileUrl, status | Yes (min 2) |
| **CourierAvailability** | Operating hours | dayOfWeek, startTime, endTime | Yes |
| **CourierPreferences** | Delivery preferences | maxConcurrentDeliveries, acceptsCOD | Yes |
| **CourierGuarantor** | Reference person | fullName, phoneNumber, relationship | Recommended |

**Together they ensure**:
✅ Only verified couriers can deliver  
✅ Couriers only assigned during available hours  
✅ Assignments match courier preferences  
✅ Platform has recourse through guarantor  
✅ Better courier satisfaction and retention  
✅ Safer platform for buyers and sellers
