const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Courier Onboarding Controller
 * Handles 4-step onboarding process for couriers:
 * 1. Personal Info & Vehicle Details
 * 2. Service Areas (zone-based) OR Routes (route-based for transporters)
 * 3. Documents & Verification
 * 4. Operating Hours & Preferences
 * 
 * Verification Levels:
 * - unverified: Just registered
 * - basic: Email + phone verified (after registration)
 * - standard: Documents verified + first successful payment/delivery
 * - premium: Enhanced background check (future feature)
 */

/**
 * Get courier onboarding status
 * GET /api/courier-onboarding/status
 */
exports.getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        serviceAreas: {
          where: { isActive: true }
        },
        routes: {
          where: { isActive: true }
        },
        documents: true,
        availability: {
          orderBy: { dayOfWeek: 'asc' }
        },
        preferences: true,
        guarantor: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.role !== 'courier') {
      return res.status(403).json({
        error: true,
        message: 'Only couriers can access onboarding',
        code: 'NOT_COURIER'
      });
    }

    // Define onboarding steps
    const steps = [
      {
        step: 1,
        title: 'Personal & Vehicle Information',
        description: 'Tell us about yourself and your vehicle',
        completed: !!(
          user.firstName &&
          user.lastName &&
          user.phoneNumber &&
          user.vehicleType &&
          user.governmentIdType
        ),
        fields: ['firstName', 'lastName', 'phoneNumber', 'vehicleType', 'governmentIdType']
      },
      {
        step: 2,
        title: 'Service Area & Routes',
        description: 'Define where you operate',
        completed: user.serviceAreas.length > 0 || user.routes.length > 0,
        fields: ['serviceAreas', 'routes']
      },
      {
        step: 3,
        title: 'Documents & Verification',
        description: 'Upload verification documents',
        completed: user.documents.filter(d => d.status === 'approved').length >= 2, // At least 2 approved docs
        fields: ['documents']
      },
      {
        step: 4,
        title: 'Operating Hours & Preferences',
        description: 'Set your availability and preferences',
        completed: user.availability.length > 0 && !!user.preferences,
        fields: ['availability', 'preferences']
      }
    ];

    // Calculate current step
    let currentStep = 1;
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].completed) {
        currentStep = i + 1;
        break;
      }
      if (i === steps.length - 1) {
        currentStep = 5; // All complete
      }
    }

    const isComplete = currentStep === 5;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        courierOnboarded: user.courierOnboarded,
        courierOnboardingStep: user.courierOnboardingStep,
        courierVerificationStatus: user.courierVerificationStatus,
        vehicleType: user.vehicleType,
        vehicleRegistration: user.vehicleRegistration,
        vehicleColor: user.vehicleColor,
        vehicleMake: user.vehicleMake,
        vehicleModel: user.vehicleModel,
        vehicleCapacity: user.vehicleCapacity,
        courierRating: user.courierRating,
        completedDeliveries: user.completedDeliveries,
        serviceAreasCount: user.serviceAreas.length,
        routesCount: user.routes.length,
        documentsCount: user.documents.length,
        approvedDocumentsCount: user.documents.filter(d => d.status === 'approved').length
      },
      steps,
      currentStep: isComplete ? 5 : currentStep,
      isComplete,
      verificationStatus: user.courierVerificationStatus
    });

  } catch (error) {
    logger.error('Get courier onboarding status error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get onboarding status',
      code: 'STATUS_ERROR'
    });
  }
};

/**
 * Update personal info and vehicle details (Step 1)
 * POST /api/courier-onboarding/personal-info
 */
exports.updatePersonalInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      phoneNumber,
      vehicleType,
      vehicleRegistration,
      vehicleColor,
      vehicleMake,
      vehicleModel,
      vehicleCapacity,
      governmentIdType,
      governmentIdNumber
    } = req.body;

    // Validation
    if (!firstName || !lastName || !phoneNumber || !vehicleType || !governmentIdType) {
      return res.status(400).json({
        error: true,
        message: 'First name, last name, phone number, vehicle type, and ID type are required',
        code: 'MISSING_FIELDS'
      });
    }

    const validVehicleTypes = ['motorcycle', 'car', 'van', 'bicycle', 'on_foot'];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        error: true,
        message: `Invalid vehicle type. Must be one of: ${validVehicleTypes.join(', ')}`,
        code: 'INVALID_VEHICLE_TYPE'
      });
    }

    const validIdTypes = ['NIN', 'drivers_license', 'voters_card', 'passport'];
    if (!validIdTypes.includes(governmentIdType)) {
      return res.status(400).json({
        error: true,
        message: `Invalid ID type. Must be one of: ${validIdTypes.join(', ')}`,
        code: 'INVALID_ID_TYPE'
      });
    }

    // Validate phone number
    const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid Nigerian phone number format',
        code: 'INVALID_PHONE'
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        vehicleType,
        vehicleRegistration,
        vehicleColor,
        vehicleMake,
        vehicleModel,
        vehicleCapacity: vehicleCapacity ? parseFloat(vehicleCapacity) : null,
        governmentIdType,
        governmentIdNumber,
        courierOnboardingStep: Math.max(1, req.user.courierOnboardingStep || 0)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        vehicleType: true,
        vehicleRegistration: true,
        vehicleColor: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleCapacity: true,
        governmentIdType: true,
        courierOnboardingStep: true
      }
    });

    logger.info(`Courier ${userId} updated personal info (Step 1)`);

    res.json({
      message: 'Personal and vehicle information updated successfully',
      user
    });

  } catch (error) {
    logger.error('Update courier personal info error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update personal information',
      code: 'UPDATE_ERROR'
    });
  }
};

/**
 * Add service area (zone-based, Step 2)
 * POST /api/courier-onboarding/service-area
 */
exports.addServiceArea = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      state,
      lgas,
      polygon,
      centerLat,
      centerLng,
      maxRadius
    } = req.body;

    // Validation
    if (!name || !state) {
      return res.status(400).json({
        error: true,
        message: 'Name and state are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Create service area
    const serviceArea = await prisma.courierServiceArea.create({
      data: {
        courierId: userId,
        name,
        state,
        lgas: lgas ? JSON.stringify(lgas) : null,
        polygon: polygon ? JSON.stringify(polygon) : null,
        centerLat: centerLat ? parseFloat(centerLat) : null,
        centerLng: centerLng ? parseFloat(centerLng) : null,
        maxRadius: maxRadius ? parseFloat(maxRadius) : 10,
        isActive: true
      }
    });

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        courierOnboardingStep: Math.max(2, req.user.courierOnboardingStep || 0)
      }
    });

    logger.info(`Courier ${userId} added service area (Step 2): ${serviceArea.id}`);

    res.status(201).json({
      message: 'Service area added successfully',
      serviceArea: {
        ...serviceArea,
        lgas: serviceArea.lgas ? JSON.parse(serviceArea.lgas) : [],
        polygon: serviceArea.polygon ? JSON.parse(serviceArea.polygon) : null
      }
    });

  } catch (error) {
    logger.error('Add service area error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add service area',
      code: 'ADD_AREA_ERROR'
    });
  }
};

/**
 * Add route (route-based for transporters, Step 2)
 * POST /api/courier-onboarding/route
 */
exports.addRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      startCity,
      startState,
      startLga,
      startLandmark,
      startLat,
      startLng,
      endCity,
      endState,
      endLga,
      endLandmark,
      endLat,
      endLng,
      stopPoints,
      frequency,
      operatingDays,
      departureTime,
      estimatedArrival,
      estimatedDuration
    } = req.body;

    // Validation
    if (!name || !startCity || !startState || !endCity || !endState) {
      return res.status(400).json({
        error: true,
        message: 'Name, start city/state, and end city/state are required',
        code: 'MISSING_FIELDS'
      });
    }

    const validFrequencies = ['daily', 'weekdays', 'weekends', 'specific_days'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return res.status(400).json({
        error: true,
        message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
        code: 'INVALID_FREQUENCY'
      });
    }

    // Create route
    const route = await prisma.courierRoute.create({
      data: {
        courierId: userId,
        name,
        startCity,
        startState,
        startLga,
        startLandmark,
        startLat: startLat ? parseFloat(startLat) : null,
        startLng: startLng ? parseFloat(startLng) : null,
        endCity,
        endState,
        endLga,
        endLandmark,
        endLat: endLat ? parseFloat(endLat) : null,
        endLng: endLng ? parseFloat(endLng) : null,
        stopPoints: stopPoints ? JSON.stringify(stopPoints) : null,
        frequency: frequency || 'daily',
        operatingDays: operatingDays ? JSON.stringify(operatingDays) : null,
        departureTime,
        estimatedArrival,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        isActive: true
      }
    });

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        courierOnboardingStep: Math.max(2, req.user.courierOnboardingStep || 0)
      }
    });

    logger.info(`Courier ${userId} added route (Step 2): ${route.id}`);

    res.status(201).json({
      message: 'Route added successfully',
      route: {
        ...route,
        stopPoints: route.stopPoints ? JSON.parse(route.stopPoints) : [],
        operatingDays: route.operatingDays ? JSON.parse(route.operatingDays) : []
      }
    });

  } catch (error) {
    logger.error('Add route error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add route',
      code: 'ADD_ROUTE_ERROR'
    });
  }
};

/**
 * Upload courier document (Step 3)
 * POST /api/courier-onboarding/document
 */
exports.uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      documentType,
      fileUrl,
      publicId,
      fileName,
      fileSize,
      mimeType,
      expiryDate,
      notes
    } = req.body;

    // Validation
    if (!documentType || !fileUrl) {
      return res.status(400).json({
        error: true,
        message: 'Document type and file URL are required',
        code: 'MISSING_FIELDS'
      });
    }

    const validDocTypes = [
      'government_id',
      'proof_address',
      'vehicle_registration',
      'drivers_license',
      'guarantor_info',
      'profile_photo'
    ];

    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({
        error: true,
        message: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}`,
        code: 'INVALID_DOC_TYPE'
      });
    }

    // Check if document type already exists
    const existingDoc = await prisma.courierDocument.findFirst({
      where: {
        courierId: userId,
        documentType,
        status: { in: ['pending', 'approved'] }
      }
    });

    if (existingDoc) {
      return res.status(400).json({
        error: true,
        message: `You already have a ${documentType.replace('_', ' ')} document pending or approved`,
        code: 'DOCUMENT_EXISTS'
      });
    }

    // Create document
    const document = await prisma.courierDocument.create({
      data: {
        courierId: userId,
        documentType,
        fileUrl,
        publicId,
        fileName,
        fileSize: fileSize ? parseInt(fileSize) : null,
        mimeType,
        status: 'pending',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes
      }
    });

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        courierOnboardingStep: Math.max(3, req.user.courierOnboardingStep || 0)
      }
    });

    logger.info(`Courier ${userId} uploaded document (Step 3): ${documentType}`);

    res.status(201).json({
      message: 'Document uploaded successfully. Pending verification.',
      document
    });

  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to upload document',
      code: 'UPLOAD_ERROR'
    });
  }
};

/**
 * Add guarantor information (Step 3)
 * POST /api/courier-onboarding/guarantor
 */
exports.addGuarantor = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      phoneNumber,
      email,
      relationship,
      address,
      occupation
    } = req.body;

    // Validation
    if (!fullName || !phoneNumber || !relationship) {
      return res.status(400).json({
        error: true,
        message: 'Full name, phone number, and relationship are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if guarantor already exists
    const existingGuarantor = await prisma.courierGuarantor.findUnique({
      where: { courierId: userId }
    });

    let guarantor;
    if (existingGuarantor) {
      // Update existing
      guarantor = await prisma.courierGuarantor.update({
        where: { courierId: userId },
        data: {
          fullName,
          phoneNumber,
          email,
          relationship,
          address,
          occupation
        }
      });
    } else {
      // Create new
      guarantor = await prisma.courierGuarantor.create({
        data: {
          courierId: userId,
          fullName,
          phoneNumber,
          email,
          relationship,
          address,
          occupation,
          verificationStatus: 'pending'
        }
      });
    }

    logger.info(`Courier ${userId} added/updated guarantor`);

    res.json({
      message: 'Guarantor information saved successfully',
      guarantor
    });

  } catch (error) {
    logger.error('Add guarantor error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to save guarantor information',
      code: 'GUARANTOR_ERROR'
    });
  }
};

/**
 * Set operating hours (Step 4)
 * POST /api/courier-onboarding/availability
 */
exports.setAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { schedule } = req.body; // Array of { dayOfWeek, startTime, endTime, available }

    // Validation
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        error: true,
        message: 'Schedule array is required',
        code: 'INVALID_SCHEDULE'
      });
    }

    // Delete existing availability
    await prisma.courierAvailability.deleteMany({
      where: { courierId: userId }
    });

    // Create new availability records
    const availability = await Promise.all(
      schedule.map(day =>
        prisma.courierAvailability.create({
          data: {
            courierId: userId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            available: day.available !== false
          }
        })
      )
    );

    // Update user onboarding step
    await prisma.user.update({
      where: { id: userId },
      data: {
        courierOnboardingStep: Math.max(4, req.user.courierOnboardingStep || 0)
      }
    });

    logger.info(`Courier ${userId} set availability (Step 4)`);

    res.json({
      message: 'Availability set successfully',
      availability
    });

  } catch (error) {
    logger.error('Set availability error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to set availability',
      code: 'AVAILABILITY_ERROR'
    });
  }
};

/**
 * Set courier preferences (Step 4)
 * POST /api/courier-onboarding/preferences
 */
exports.setPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      maxConcurrentDeliveries,
      maxDistancePerDelivery,
      acceptsInterCity,
      preferredPackageTypes,
      requiresAdvanceNotice,
      advanceNoticeHours,
      minimumEarningPerDelivery,
      preferredPaymentMethod,
      acceptsCOD,
      maxCODAmount,
      preferredAreas,
      blockedAreas
    } = req.body;

    // Check if preferences exist
    const existingPrefs = await prisma.courierPreferences.findUnique({
      where: { courierId: userId }
    });

    let preferences;
    const prefsData = {
      maxConcurrentDeliveries: maxConcurrentDeliveries || 3,
      maxDistancePerDelivery: maxDistancePerDelivery || 15,
      acceptsInterCity: acceptsInterCity || false,
      preferredPackageTypes: preferredPackageTypes ? JSON.stringify(preferredPackageTypes) : null,
      requiresAdvanceNotice: requiresAdvanceNotice || false,
      advanceNoticeHours: advanceNoticeHours || 0,
      minimumEarningPerDelivery: minimumEarningPerDelivery || 500,
      preferredPaymentMethod: preferredPaymentMethod || 'bank_transfer',
      acceptsCOD: acceptsCOD !== false,
      maxCODAmount: maxCODAmount || 50000,
      preferredAreas: preferredAreas ? JSON.stringify(preferredAreas) : null,
      blockedAreas: blockedAreas ? JSON.stringify(blockedAreas) : null
    };

    if (existingPrefs) {
      // Update existing
      preferences = await prisma.courierPreferences.update({
        where: { courierId: userId },
        data: prefsData
      });
    } else {
      // Create new
      preferences = await prisma.courierPreferences.create({
        data: {
          courierId: userId,
          ...prefsData
        }
      });
    }

    logger.info(`Courier ${userId} set preferences (Step 4)`);

    res.json({
      message: 'Preferences saved successfully',
      preferences: {
        ...preferences,
        preferredPackageTypes: preferences.preferredPackageTypes ? JSON.parse(preferences.preferredPackageTypes) : [],
        preferredAreas: preferences.preferredAreas ? JSON.parse(preferences.preferredAreas) : [],
        blockedAreas: preferences.blockedAreas ? JSON.parse(preferences.blockedAreas) : []
      }
    });

  } catch (error) {
    logger.error('Set preferences error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to set preferences',
      code: 'PREFERENCES_ERROR'
    });
  }
};

/**
 * Complete courier onboarding
 * POST /api/courier-onboarding/complete
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if all steps are complete
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        serviceAreas: { where: { isActive: true } },
        routes: { where: { isActive: true } },
        documents: true,
        availability: true,
        preferences: true
      }
    });

    const missingSteps = [];

    // Step 1: Personal info
    if (!user.firstName || !user.lastName || !user.phoneNumber || !user.vehicleType) {
      missingSteps.push('Personal and vehicle information');
    }

    // Step 2: Service areas or routes
    if (user.serviceAreas.length === 0 && user.routes.length === 0) {
      missingSteps.push('Service area or route');
    }

    // Step 3: Documents (at least 2 pending or approved)
    if (user.documents.length < 2) {
      missingSteps.push('Upload at least 2 verification documents');
    }

    // Step 4: Availability and preferences
    if (user.availability.length === 0) {
      missingSteps.push('Operating hours');
    }
    if (!user.preferences) {
      missingSteps.push('Courier preferences');
    }

    if (missingSteps.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Please complete all onboarding steps',
        code: 'INCOMPLETE_ONBOARDING',
        missingSteps
      });
    }

    // Mark onboarding as complete
    await prisma.user.update({
      where: { id: userId },
      data: {
        courierOnboarded: true,
        courierOnboardingStep: 4,
        // Set to 'basic' verification after onboarding
        // Will upgrade to 'standard' after first successful payment/delivery
        courierVerificationStatus: 'basic'
      }
    });

    logger.info(`Courier ${userId} completed onboarding`);

    res.json({
      message: 'Courier onboarding completed successfully! You can now accept deliveries.',
      user: {
        id: user.id,
        courierOnboarded: true,
        courierVerificationStatus: 'basic'
      },
      note: 'Your verification status will be upgraded to "standard" after your first successful delivery or payment.'
    });

  } catch (error) {
    logger.error('Complete courier onboarding error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to complete onboarding',
      code: 'COMPLETE_ERROR'
    });
  }
};

/**
 * Get vehicle types
 * GET /api/courier-onboarding/vehicle-types
 */
exports.getVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = [
      {
        value: 'motorcycle',
        label: 'Motorcycle',
        icon: '🏍️',
        capacity: '30kg',
        description: 'Fast delivery for small packages'
      },
      {
        value: 'bicycle',
        label: 'Bicycle',
        icon: '🚴',
        capacity: '10kg',
        description: 'Eco-friendly short-distance delivery'
      },
      {
        value: 'car',
        label: 'Car',
        icon: '🚗',
        capacity: '100kg',
        description: 'Medium-sized packages and multiple stops'
      },
      {
        value: 'van',
        label: 'Van/Truck',
        icon: '🚐',
        capacity: '500kg+',
        description: 'Large packages and bulk deliveries'
      },
      {
        value: 'on_foot',
        label: 'On Foot',
        icon: '🚶',
        capacity: '5kg',
        description: 'Very local deliveries within walking distance'
      }
    ];

    res.json({ vehicleTypes });

  } catch (error) {
    logger.error('Get vehicle types error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get vehicle types',
      code: 'VEHICLE_TYPES_ERROR'
    });
  }
};

/**
 * Get service areas for current courier
 * GET /api/courier-onboarding/service-areas
 */
exports.getServiceAreas = async (req, res) => {
  try {
    const userId = req.user.id;

    const serviceAreas = await prisma.courierServiceArea.findMany({
      where: { courierId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      serviceAreas: serviceAreas.map(area => ({
        ...area,
        lgas: area.lgas ? JSON.parse(area.lgas) : [],
        polygon: area.polygon ? JSON.parse(area.polygon) : null
      })),
      count: serviceAreas.length
    });

  } catch (error) {
    logger.error('Get service areas error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get service areas',
      code: 'GET_AREAS_ERROR'
    });
  }
};

/**
 * Get routes for current courier
 * GET /api/courier-onboarding/routes
 */
exports.getRoutes = async (req, res) => {
  try {
    const userId = req.user.id;

    const routes = await prisma.courierRoute.findMany({
      where: { courierId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      routes: routes.map(route => ({
        ...route,
        stopPoints: route.stopPoints ? JSON.parse(route.stopPoints) : [],
        operatingDays: route.operatingDays ? JSON.parse(route.operatingDays) : []
      })),
      count: routes.length
    });

  } catch (error) {
    logger.error('Get routes error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get routes',
      code: 'GET_ROUTES_ERROR'
    });
  }
};

/**
 * Get documents for current courier
 * GET /api/courier-onboarding/documents
 */
exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    const documents = await prisma.courierDocument.findMany({
      where: { courierId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      documents,
      count: documents.length,
      approvedCount: documents.filter(d => d.status === 'approved').length,
      pendingCount: documents.filter(d => d.status === 'pending').length
    });

  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get documents',
      code: 'GET_DOCUMENTS_ERROR'
    });
  }
};

/**
 * Upgrade courier verification to 'standard' (called after first successful payment/delivery)
 * This is called internally, not exposed as API endpoint
 */
exports.upgradeToStandardVerification = async (courierId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: courierId }
    });

    if (!user || user.role !== 'courier') {
      return { success: false, message: 'User is not a courier' };
    }

    if (user.courierVerificationStatus === 'basic') {
      await prisma.user.update({
        where: { id: courierId },
        data: {
          courierVerificationStatus: 'standard'
        }
      });

      logger.info(`Courier ${courierId} upgraded to standard verification`);
      return { success: true, message: 'Upgraded to standard verification' };
    }

    return { success: false, message: 'Already at standard or higher verification' };

  } catch (error) {
    logger.error('Upgrade courier verification error:', error);
    return { success: false, message: 'Failed to upgrade verification' };
  }
};

module.exports = exports;
