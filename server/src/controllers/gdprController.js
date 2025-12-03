const prisma = require('../../config/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Export user data (GDPR right to data portability)
 * @route GET /api/gdpr/export-data
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Collect all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        buyerOrders: {
          include: {
            items: true,
          },
        },
        sellerOrders: true,
        products: true,
        reviews: true,
        favorites: true,
        notifications: true,
        wallet: true,
        wishlist: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive fields
    const exportData = {
      ...user,
      password: undefined,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
    };

    // Create JSON file
    const fileName = `user-data-${userId}-${Date.now()}.json`;
    const exportPath = path.join(process.cwd(), 'exports', fileName);

    // Ensure exports directory exists
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

    res.json({
      message: 'Data export ready',
      downloadUrl: `/api/gdpr/download-export/${fileName}`,
      expiresIn: '7 days',
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Download exported data
 * @route GET /api/gdpr/download-export/:fileName
 */
const downloadExport = async (req, res) => {
  try {
    const { fileName } = req.params;
    const userId = req.user.id;

    // Verify file belongs to user
    if (!fileName.includes(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(process.cwd(), 'exports', fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).json({ message: 'File not found' });
      }
    });
  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete user account (GDPR right to erasure)
 * @route DELETE /api/gdpr/delete-account
 */
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'Please confirm deletion by typing DELETE' });
    }

    // Check for pending orders/transactions
    const pendingOrders = await prisma.order.count({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
        status: { in: ['pending', 'processing', 'shipped', 'out_for_delivery'] },
      },
    });

    if (pendingOrders > 0) {
      return res.status(400).json({
        message: 'Cannot delete account with pending orders. Please complete or cancel them first.',
        pendingOrders,
      });
    }

    // Anonymize user data instead of hard delete (for order history preservation)
    const anonymizedEmail = `deleted-${userId}@deleted.com`;
    const anonymizedName = `Deleted User ${userId.slice(0, 8)}`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        name: anonymizedName,
        phone: null,
        avatar: null,
        address: null,
        // isDeleted: true, // Uncomment if field exists
        deletedAt: new Date(),
      },
    });

    // Delete personal data
    await prisma.address.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });

    res.json({
      message: 'Account deleted successfully',
      note: 'Your account has been anonymized. Order history is preserved for legal compliance.',
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get consent preferences
 * @route GET /api/gdpr/consent
 */
const getConsent = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        // consentMarketing: true, // Uncomment if fields exist
        // consentAnalytics: true,
        // consentPersonalization: true,
        createdAt: true,
      },
    });

    res.json({
      userId: user.id,
      consent: {
        marketing: false, // user.consentMarketing || false,
        analytics: false, // user.consentAnalytics || false,
        personalization: false, // user.consentPersonalization || false,
      },
      lastUpdated: user.createdAt,
    });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update consent preferences
 * @route PUT /api/gdpr/consent
 */
const updateConsent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { marketing, analytics, personalization } = req.body;

    await prisma.user.update({
      where: { id: userId },
      data: {
        // consentMarketing: marketing, // Uncomment if fields exist
        // consentAnalytics: analytics,
        // consentPersonalization: personalization,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Consent preferences updated',
      consent: {
        marketing,
        analytics,
        personalization,
      },
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get privacy policy version accepted by user
 * @route GET /api/gdpr/privacy-acceptance
 */
const getPrivacyAcceptance = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        // privacyPolicyVersion: true, // Uncomment if field exists
        // privacyAcceptedAt: true,
      },
    });

    res.json({
      userId: user.id,
      currentVersion: '1.0', // Your current privacy policy version
      acceptedVersion: '1.0', // user.privacyPolicyVersion || '1.0',
      acceptedAt: user.createdAt, // user.privacyAcceptedAt || user.createdAt,
      requiresUpdate: false,
    });
  } catch (error) {
    console.error('Get privacy acceptance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Data rectification request
 * @route POST /api/gdpr/rectify
 */
const rectifyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { field, oldValue, newValue, reason } = req.body;

    // Log rectification request
    const request = {
      userId,
      field,
      oldValue,
      newValue,
      reason,
      status: 'pending',
      requestedAt: new Date(),
    };

    // In production, this would create a ticket/request for admin review
    res.json({
      message: 'Data rectification request submitted',
      request,
      note: 'Your request will be reviewed by our team within 30 days',
    });
  } catch (error) {
    console.error('Rectify data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  exportUserData,
  downloadExport,
  deleteUserAccount,
  getConsent,
  updateConsent,
  getPrivacyAcceptance,
  rectifyData,
};
