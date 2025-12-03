const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Get user profile
 * GET /api/social/profile/:userId
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: req.user.id === userId || req.user.role === 'admin', // Only show email to self or admin
        role: true,
        profilePicture: true,
        createdAt: true,
        notificationPreferences: true, // Contains profile data in JSON
        _count: {
          select: {
            products: true,
            orders: true,
            bids: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Extract profile data from notificationPreferences (JSON proxy)
    const profile = user.notificationPreferences?.profile || {};
    const followers = user.notificationPreferences?.followers || [];
    const following = user.notificationPreferences?.following || [];

    // Check if current user is following this profile
    const isFollowing = following.includes(req.user.id);
    const isOwnProfile = req.user.id === userId;

    // Get recent activity
    const recentProducts = await prisma.product.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        createdAt: true,
      },
    });

    const recentReviews = await prisma.review.findMany({
      where: { reviewerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        stats: user._count,
      },
      profile: {
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        socialLinks: profile.socialLinks || {},
        followers: followers.length,
        following: following.length,
        isFollowing,
        isOwnProfile,
      },
      activity: {
        recentProducts,
        recentReviews,
      },
    });
  } catch (error) {
    logger.error('Get user profile error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get user profile',
      code: 'GET_PROFILE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update user profile
 * PUT /api/social/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, location, website, socialLinks } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const updatedPreferences = {
      ...user.notificationPreferences,
      profile: {
        ...(user.notificationPreferences?.profile || {}),
        bio: bio !== undefined ? bio : user.notificationPreferences?.profile?.bio,
        location: location !== undefined ? location : user.notificationPreferences?.profile?.location,
        website: website !== undefined ? website : user.notificationPreferences?.profile?.website,
        socialLinks: socialLinks !== undefined ? socialLinks : user.notificationPreferences?.profile?.socialLinks,
      },
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updatedPreferences,
      },
    });

    logger.info('Profile updated', { requestId: req.id, userId });

    res.json({
      message: 'Profile updated successfully',
      profile: updatedPreferences.profile,
    });
  } catch (error) {
    logger.error('Update profile error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Follow a user
 * POST /api/social/follow/:userId
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        error: true,
        message: 'You cannot follow yourself',
        code: 'CANNOT_FOLLOW_SELF',
        requestId: req.id,
      });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, notificationPreferences: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Update current user's following list
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { notificationPreferences: true },
    });

    let following = currentUser.notificationPreferences?.following || [];
    
    if (following.includes(userId)) {
      return res.status(400).json({
        error: true,
        message: 'Already following this user',
        code: 'ALREADY_FOLLOWING',
        requestId: req.id,
      });
    }

    following.push(userId);

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        notificationPreferences: {
          ...currentUser.notificationPreferences,
          following,
        },
      },
    });

    // Update target user's followers list
    let followers = targetUser.notificationPreferences?.followers || [];
    followers.push(currentUserId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...targetUser.notificationPreferences,
          followers,
        },
      },
    });

    logger.info('User followed', { requestId: req.id, follower: currentUserId, followed: userId });

    res.json({
      message: 'Successfully followed user',
      following: following.length,
    });
  } catch (error) {
    logger.error('Follow user error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to follow user',
      code: 'FOLLOW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Unfollow a user
 * DELETE /api/social/follow/:userId
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Update current user's following list
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { notificationPreferences: true },
    });

    let following = currentUser.notificationPreferences?.following || [];
    
    if (!following.includes(userId)) {
      return res.status(400).json({
        error: true,
        message: 'Not following this user',
        code: 'NOT_FOLLOWING',
        requestId: req.id,
      });
    }

    following = following.filter(id => id !== userId);

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        notificationPreferences: {
          ...currentUser.notificationPreferences,
          following,
        },
      },
    });

    // Update target user's followers list
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    let followers = targetUser?.notificationPreferences?.followers || [];
    followers = followers.filter(id => id !== currentUserId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...targetUser.notificationPreferences,
          followers,
        },
      },
    });

    logger.info('User unfollowed', { requestId: req.id, follower: currentUserId, unfollowed: userId });

    res.json({
      message: 'Successfully unfollowed user',
      following: following.length,
    });
  } catch (error) {
    logger.error('Unfollow user error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to unfollow user',
      code: 'UNFOLLOW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get followers list
 * GET /api/social/followers/:userId
 */
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    const followerIds = user.notificationPreferences?.followers || [];

    // Get follower details
    const followers = await prisma.user.findMany({
      where: {
        id: { in: followerIds },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
      },
    });

    res.json({
      followers,
      count: followers.length,
    });
  } catch (error) {
    logger.error('Get followers error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get followers',
      code: 'GET_FOLLOWERS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get following list
 * GET /api/social/following/:userId
 */
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    const followingIds = user.notificationPreferences?.following || [];

    // Get following details
    const following = await prisma.user.findMany({
      where: {
        id: { in: followingIds },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
      },
    });

    res.json({
      following,
      count: following.length,
    });
  } catch (error) {
    logger.error('Get following error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get following',
      code: 'GET_FOLLOWING_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get activity feed (posts from followed users)
 * GET /api/social/feed
 */
exports.getActivityFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const followingIds = user?.notificationPreferences?.following || [];

    // Get recent products from followed users
    const recentProducts = await prisma.product.findMany({
      where: {
        sellerId: { in: followingIds },
      },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    // Get recent reviews from followed users
    const recentReviews = await prisma.review.findMany({
      where: {
        reviewerId: { in: followingIds },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
      },
    });

    // Combine and sort by date
    const feed = [
      ...recentProducts.map(p => ({
        type: 'product',
        id: p.id,
        data: p,
        createdAt: p.createdAt,
      })),
      ...recentReviews.map(r => ({
        type: 'review',
        id: r.id,
        data: r,
        createdAt: r.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      feed: feed.slice(0, parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: feed.length > parseInt(limit),
    });
  } catch (error) {
    logger.error('Get activity feed error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get activity feed',
      code: 'GET_FEED_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;
