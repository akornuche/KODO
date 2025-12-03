const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Courier Assignment Engine
 * Smart algorithm for matching deliveries with best-suited couriers
 * Supports both zone-based (local) and route-based (inter-city) assignments
 */

class CourierAssignmentEngine {
  /**
   * Find best courier for a delivery
   * @param {Object} delivery - Delivery object with pickup and dropoff locations
   * @param {Object} options - Assignment options
   * @returns {Object|null} Best matched courier with score
   */
  async findBestCourier(delivery, options = {}) {
    try {
      const { pickupLat, pickupLng, dropoffLat, dropoffLng } = delivery;

      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
        logger.warn('Missing location coordinates for delivery', { deliveryId: delivery.id });
        return null;
      }

      // Determine if this is inter-city delivery
      const isInterCity = this.isInterCityDelivery(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      );

      logger.info('Finding courier for delivery', {
        deliveryId: delivery.id,
        isInterCity,
        pickup: `${pickupLat},${pickupLng}`,
        dropoff: `${dropoffLat},${dropoffLng}`
      });

      // Get zone-based couriers (local deliveries)
      let zoneCouriers = [];
      if (!isInterCity || options.includeLocal) {
        zoneCouriers = await this.getZoneCouriers(
          { lat: pickupLat, lng: pickupLng },
          { lat: dropoffLat, lng: dropoffLng }
        );
      }

      // Get route-based couriers (inter-city)
      let routeCouriers = [];
      if (isInterCity || options.includeInterCity) {
        routeCouriers = await this.getRouteCouriers(
          { lat: pickupLat, lng: pickupLng },
          { lat: dropoffLat, lng: dropoffLng }
        );
      }

      // Combine all potential couriers
      const allCouriers = [...zoneCouriers, ...routeCouriers];

      if (allCouriers.length === 0) {
        logger.warn('No couriers available for delivery', { deliveryId: delivery.id });
        return null;
      }

      // Filter by availability and capacity
      const availableCouriers = this.filterAvailableCouriers(allCouriers, delivery);

      if (availableCouriers.length === 0) {
        logger.warn('No available couriers after filtering', { deliveryId: delivery.id });
        return null;
      }

      // Calculate scores for each courier
      const scoredCouriers = await this.scoreCouriers(availableCouriers, delivery);

      // Sort by score (highest first)
      scoredCouriers.sort((a, b) => b.score - a.score);

      logger.info('Found couriers for delivery', {
        deliveryId: delivery.id,
        count: scoredCouriers.length,
        bestScore: scoredCouriers[0]?.score
      });

      return scoredCouriers[0] || null;

    } catch (error) {
      logger.error('Find best courier error:', error);
      return null;
    }
  }

  /**
   * Get all potential couriers for a delivery (sorted by score)
   * @param {Object} delivery - Delivery object
   * @param {Number} limit - Maximum number of couriers to return
   * @returns {Array} Array of scored couriers
   */
  async findCouriers(delivery, limit = 10) {
    try {
      const { pickupLat, pickupLng, dropoffLat, dropoffLng } = delivery;

      const isInterCity = this.isInterCityDelivery(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      );

      const zoneCouriers = await this.getZoneCouriers(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      );

      const routeCouriers = isInterCity ? await this.getRouteCouriers(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      ) : [];

      const allCouriers = [...zoneCouriers, ...routeCouriers];
      const availableCouriers = this.filterAvailableCouriers(allCouriers, delivery);
      const scoredCouriers = await this.scoreCouriers(availableCouriers, delivery);

      scoredCouriers.sort((a, b) => b.score - a.score);

      return scoredCouriers.slice(0, limit);

    } catch (error) {
      logger.error('Find couriers error:', error);
      return [];
    }
  }

  /**
   * Get zone-based couriers (local deliveries)
   * @param {Object} pickupLocation - {lat, lng}
   * @param {Object} dropoffLocation - {lat, lng}
   * @returns {Array} Array of couriers
   */
  async getZoneCouriers(pickupLocation, dropoffLocation) {
    try {
      // Find couriers with active service areas
      const couriers = await prisma.user.findMany({
        where: {
          role: 'courier',
          courierOnboarded: true,
          courierVerificationStatus: { in: ['basic', 'standard', 'premium'] },
          serviceAreas: {
            some: {
              isActive: true
            }
          }
        },
        include: {
          serviceAreas: {
            where: { isActive: true }
          },
          preferences: true,
          availability: true
        }
      });

      // Filter couriers whose service areas cover both locations
      const matchingCouriers = couriers.filter(courier => {
        return courier.serviceAreas.some(area => {
          return (
            this.isLocationInServiceArea(pickupLocation, area) &&
            this.isLocationInServiceArea(dropoffLocation, area)
          );
        });
      });

      logger.debug(`Found ${matchingCouriers.length} zone-based couriers`);
      return matchingCouriers;

    } catch (error) {
      logger.error('Get zone couriers error:', error);
      return [];
    }
  }

  /**
   * Get route-based couriers (inter-city transporters)
   * @param {Object} pickupLocation - {lat, lng}
   * @param {Object} dropoffLocation - {lat, lng}
   * @returns {Array} Array of couriers
   */
  async getRouteCouriers(pickupLocation, dropoffLocation) {
    try {
      // Get today's day of week (0 = Sunday, 6 = Saturday)
      const today = new Date().getDay();

      // Find couriers with active routes
      const couriers = await prisma.user.findMany({
        where: {
          role: 'courier',
          courierOnboarded: true,
          courierVerificationStatus: { in: ['basic', 'standard', 'premium'] },
          routes: {
            some: {
              isActive: true
            }
          },
          preferences: {
            acceptsInterCity: true
          }
        },
        include: {
          routes: {
            where: { isActive: true }
          },
          preferences: true,
          availability: true
        }
      });

      // Filter couriers with routes matching pickup and dropoff
      const matchingCouriers = couriers.filter(courier => {
        return courier.routes.some(route => {
          // Check if route operates today
          if (route.operatingDays) {
            const operatingDays = JSON.parse(route.operatingDays);
            if (!operatingDays.includes(today)) {
              return false;
            }
          }

          // Check if route covers pickup and dropoff locations
          return this.isRouteMatch(route, pickupLocation, dropoffLocation);
        });
      });

      logger.debug(`Found ${matchingCouriers.length} route-based couriers`);
      return matchingCouriers;

    } catch (error) {
      logger.error('Get route couriers error:', error);
      return [];
    }
  }

  /**
   * Filter couriers by availability and capacity
   * @param {Array} couriers - Array of courier objects
   * @param {Object} delivery - Delivery object
   * @returns {Array} Filtered couriers
   */
  filterAvailableCouriers(couriers, delivery) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return couriers.filter(courier => {
      // Check if courier has preferences
      if (!courier.preferences) {
        return true; // Allow if no preferences set
      }

      const prefs = courier.preferences;

      // Check max concurrent deliveries
      if (courier.completedDeliveries >= prefs.maxConcurrentDeliveries) {
        return false;
      }

      // Check vehicle capacity (if delivery has weight)
      if (delivery.estimatedWeight && courier.vehicleCapacity) {
        if (delivery.estimatedWeight > courier.vehicleCapacity) {
          return false;
        }
      }

      // Check COD acceptance
      if (delivery.isCOD && !prefs.acceptsCOD) {
        return false;
      }

      if (delivery.isCOD && delivery.codAmount > prefs.maxCODAmount) {
        return false;
      }

      // Check availability for current day
      const todayAvailability = courier.availability.find(a => a.dayOfWeek === dayOfWeek);
      if (todayAvailability && !todayAvailability.available) {
        return false;
      }

      // Check if within operating hours
      if (todayAvailability && todayAvailability.startTime && todayAvailability.endTime) {
        if (currentTime < todayAvailability.startTime || currentTime > todayAvailability.endTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate score for each courier
   * @param {Array} couriers - Array of courier objects
   * @param {Object} delivery - Delivery object
   * @returns {Array} Array of {courier, score, breakdown}
   */
  async scoreCouriers(couriers, delivery) {
    const weights = {
      distance: 0.30,
      rating: 0.25,
      workload: 0.20,
      acceptanceRate: 0.15,
      vehicleMatch: 0.10
    };

    const scoredCouriers = await Promise.all(
      couriers.map(async courier => {
        const scores = {};

        // 1. Distance score (closer = better)
        const distance = this.calculateDistance(
          { lat: courier.lastKnownLat || delivery.pickupLat, lng: courier.lastKnownLng || delivery.pickupLng },
          { lat: delivery.pickupLat, lng: delivery.pickupLng }
        );
        scores.distance = Math.max(0, 100 - (distance * 5)); // -5 points per km

        // 2. Rating score
        scores.rating = (courier.courierRating / 5) * 100;

        // 3. Workload score (fewer active = better)
        const activeDeliveries = await this.getActiveDeliveriesCount(courier.id);
        const maxDeliveries = courier.preferences?.maxConcurrentDeliveries || 3;
        scores.workload = 100 - ((activeDeliveries / maxDeliveries) * 100);

        // 4. Acceptance rate score
        scores.acceptanceRate = courier.acceptanceRate || 100;

        // 5. Vehicle match score
        scores.vehicleMatch = this.getVehicleMatchScore(
          courier.vehicleType,
          delivery.packageSize || 'medium'
        );

        // Calculate weighted total score
        const totalScore =
          (scores.distance * weights.distance) +
          (scores.rating * weights.rating) +
          (scores.workload * weights.workload) +
          (scores.acceptanceRate * weights.acceptanceRate) +
          (scores.vehicleMatch * weights.vehicleMatch);

        return {
          courier: {
            id: courier.id,
            username: courier.username,
            firstName: courier.firstName,
            lastName: courier.lastName,
            vehicleType: courier.vehicleType,
            courierRating: courier.courierRating,
            completedDeliveries: courier.completedDeliveries,
            acceptanceRate: courier.acceptanceRate
          },
          score: Math.round(totalScore * 100) / 100,
          breakdown: scores,
          distanceFromPickup: Math.round(distance * 100) / 100
        };
      })
    );

    return scoredCouriers;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {Object} point1 - {lat, lng}
   * @param {Object} point2 - {lat, lng}
   * @returns {Number} Distance in kilometers
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
      Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if delivery is inter-city (>50km)
   * @param {Object} pickup - {lat, lng}
   * @param {Object} dropoff - {lat, lng}
   * @returns {Boolean}
   */
  isInterCityDelivery(pickup, dropoff) {
    const distance = this.calculateDistance(pickup, dropoff);
    return distance > 50; // 50km threshold
  }

  /**
   * Check if location is within service area
   * @param {Object} location - {lat, lng}
   * @param {Object} serviceArea - Service area object
   * @returns {Boolean}
   */
  isLocationInServiceArea(location, serviceArea) {
    if (!location.lat || !location.lng) return false;

    // If service area has center and radius, use radius check
    if (serviceArea.centerLat && serviceArea.centerLng && serviceArea.maxRadius) {
      const distance = this.calculateDistance(
        { lat: serviceArea.centerLat, lng: serviceArea.centerLng },
        location
      );
      return distance <= serviceArea.maxRadius;
    }

    // If service area has polygon, use polygon check (simplified)
    if (serviceArea.polygon) {
      try {
        const polygon = JSON.parse(serviceArea.polygon);
        // Implement point-in-polygon check if needed
        // For now, return true if polygon exists
        return true;
      } catch (e) {
        logger.warn('Invalid polygon data', { serviceAreaId: serviceArea.id });
      }
    }

    // If no geo data, return true (allow)
    return true;
  }

  /**
   * Check if route matches pickup and dropoff locations
   * @param {Object} route - Route object
   * @param {Object} pickupLocation - {lat, lng}
   * @param {Object} dropoffLocation - {lat, lng}
   * @returns {Boolean}
   */
  isRouteMatch(route, pickupLocation, dropoffLocation) {
    if (!route.startLat || !route.startLng || !route.endLat || !route.endLng) {
      return false;
    }

    // Check if pickup is near route start (within 20km)
    const pickupDistance = this.calculateDistance(
      { lat: route.startLat, lng: route.startLng },
      pickupLocation
    );

    // Check if dropoff is near route end (within 20km)
    const dropoffDistance = this.calculateDistance(
      { lat: route.endLat, lng: route.endLng },
      dropoffLocation
    );

    return pickupDistance <= 20 && dropoffDistance <= 20;
  }

  /**
   * Get vehicle match score based on package size
   * @param {String} vehicleType
   * @param {String} packageSize - small, medium, large, xlarge
   * @returns {Number} Score 0-100
   */
  getVehicleMatchScore(vehicleType, packageSize) {
    const matchMatrix = {
      on_foot: { small: 100, medium: 50, large: 0, xlarge: 0 },
      bicycle: { small: 100, medium: 80, large: 30, xlarge: 0 },
      motorcycle: { small: 100, medium: 100, large: 60, xlarge: 20 },
      car: { small: 80, medium: 100, large: 100, xlarge: 70 },
      van: { small: 60, medium: 80, large: 100, xlarge: 100 }
    };

    return matchMatrix[vehicleType]?.[packageSize] || 50;
  }

  /**
   * Get count of active deliveries for courier
   * @param {String} courierId
   * @returns {Number}
   */
  async getActiveDeliveriesCount(courierId) {
    try {
      return await prisma.delivery.count({
        where: {
          courierId,
          status: { in: ['assigned', 'in_transit'] }
        }
      });
    } catch (error) {
      logger.error('Get active deliveries count error:', error);
      return 0;
    }
  }

  /**
   * Assign delivery to courier
   * @param {String} deliveryId
   * @param {String} courierId
   * @param {String} assignmentType - 'auto', 'manual', 'accepted'
   * @param {Number} score
   * @returns {Object}
   */
  async assignCourier(deliveryId, courierId, assignmentType = 'auto', score = null) {
    try {
      // Update delivery
      const delivery = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          courierId,
          status: 'assigned',
          updatedAt: new Date()
        },
        include: {
          order: true,
          courier: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              vehicleType: true
            }
          }
        }
      });

      // Log assignment
      await prisma.courierAssignmentLog.create({
        data: {
          deliveryId,
          courierId,
          assignmentType,
          score,
          accepted: true,
          acceptedAt: new Date()
        }
      });

      logger.info('Courier assigned to delivery', {
        deliveryId,
        courierId,
        assignmentType,
        score
      });

      return { success: true, delivery };

    } catch (error) {
      logger.error('Assign courier error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-assign best courier to delivery
   * @param {String} deliveryId
   * @returns {Object}
   */
  async autoAssignCourier(deliveryId) {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { order: true }
      });

      if (!delivery) {
        return { success: false, error: 'Delivery not found' };
      }

      if (delivery.courierId) {
        return { success: false, error: 'Delivery already assigned' };
      }

      const bestMatch = await this.findBestCourier(delivery);

      if (!bestMatch) {
        return { success: false, error: 'No couriers available' };
      }

      return await this.assignCourier(
        deliveryId,
        bestMatch.courier.id,
        'auto',
        bestMatch.score
      );

    } catch (error) {
      logger.error('Auto assign courier error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new CourierAssignmentEngine();
