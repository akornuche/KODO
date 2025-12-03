const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Address Controller
 * Handles user shipping addresses
 */

/**
 * Get user addresses
 * GET /api/addresses
 */
exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    logger.error('Get addresses error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve addresses',
    });
  }
};

/**
 * Get address by ID
 * GET /api/addresses/:id
 */
exports.getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
      });
    }

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    logger.error('Get address error:', { error: error.message, addressId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve address',
    });
  }
};

/**
 * Create address
 * POST /api/addresses
 */
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      label,
      recipientName,
      phoneNumber,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
    } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label,
        recipientName,
        phoneNumber,
        street,
        city,
        state,
        postalCode,
        country: country || 'Nigeria',
        isDefault: isDefault || false,
      },
    });

    logger.info('Address created', { addressId: address.id, userId });

    res.json({
      success: true,
      message: 'Address created successfully',
      address,
    });
  } catch (error) {
    logger.error('Create address error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create address',
    });
  }
};

/**
 * Update address
 * PUT /api/addresses/:id
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: updateData,
    });

    logger.info('Address updated', { addressId: id, userId });

    res.json({
      success: true,
      message: 'Address updated successfully',
      address,
    });
  } catch (error) {
    logger.error('Update address error:', { error: error.message, addressId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update address',
    });
  }
};

/**
 * Delete address
 * DELETE /api/addresses/:id
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
      });
    }

    await prisma.address.delete({
      where: { id },
    });

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info('Address deleted', { addressId: id, userId });

    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    logger.error('Delete address error:', { error: error.message, addressId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete address',
    });
  }
};

/**
 * Set default address
 * PUT /api/addresses/:id/set-default
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        error: true,
        message: 'Address not found',
      });
    }

    // Unset all defaults
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    logger.info('Default address set', { addressId: id, userId });

    res.json({
      success: true,
      message: 'Default address set successfully',
      address: updatedAddress,
    });
  } catch (error) {
    logger.error('Set default address error:', { error: error.message, addressId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to set default address',
    });
  }
};

/**
 * Get default address
 * GET /api/addresses/default
 */
exports.getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    res.json({
      success: true,
      address,
    });
  } catch (error) {
    logger.error('Get default address error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve default address',
    });
  }
};

module.exports = exports;
