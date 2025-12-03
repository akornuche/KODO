const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { generateTicketNumber } = require('../lib/utils');

/**
 * Support Ticket Controller
 * Handles customer support tickets
 */

/**
 * Get tickets for user
 * GET /api/support/tickets
 */
exports.getTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get tickets error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve tickets',
    });
  }
};

/**
 * Get ticket by ID
 * GET /api/support/tickets/:id
 */
exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: true,
        message: 'Ticket not found',
      });
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    logger.error('Get ticket error:', { error: error.message, ticketId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve ticket',
    });
  }
};

/**
 * Create support ticket
 * POST /api/support/tickets
 */
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, description, category, priority, orderId, attachments } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        ticketNumber: generateTicketNumber(),
        subject,
        description,
        category,
        priority: priority || 'MEDIUM',
        orderId,
        attachments,
      },
    });

    logger.info('Support ticket created', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId,
      category,
    });

    res.json({
      success: true,
      message: 'Ticket created successfully',
      ticket,
    });
  } catch (error) {
    logger.error('Create ticket error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create ticket',
    });
  }
};

/**
 * Add reply to ticket
 * POST /api/support/tickets/:id/reply
 */
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message, attachments } = req.body;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: true,
        message: 'Ticket not found',
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        error: true,
        message: 'Cannot reply to closed ticket',
      });
    }

    // Add reply to replies array
    const replies = ticket.replies || [];
    replies.push({
      userId,
      message,
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
    });

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        replies,
        lastReplyAt: new Date(),
      },
    });

    logger.info('Reply added to ticket', { ticketId: id, userId });

    res.json({
      success: true,
      message: 'Reply added successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    logger.error('Add reply error:', { error: error.message, ticketId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to add reply',
    });
  }
};

/**
 * Close ticket
 * PUT /api/support/tickets/:id/close
 */
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: true,
        message: 'Ticket not found',
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        error: true,
        message: 'Ticket already closed',
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        resolvedAt: new Date(),
      },
    });

    logger.info('Ticket closed', { ticketId: id, userId });

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    logger.error('Close ticket error:', { error: error.message, ticketId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to close ticket',
    });
  }
};

/**
 * Reopen ticket
 * PUT /api/support/tickets/:id/reopen
 */
exports.reopenTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: true,
        message: 'Ticket not found',
      });
    }

    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({
        error: true,
        message: 'Only closed tickets can be reopened',
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'OPEN',
        resolvedAt: null,
      },
    });

    logger.info('Ticket reopened', { ticketId: id, userId });

    res.json({
      success: true,
      message: 'Ticket reopened successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    logger.error('Reopen ticket error:', { error: error.message, ticketId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to reopen ticket',
    });
  }
};

/**
 * Assign ticket to agent (Admin only)
 * PUT /api/support/tickets/:id/assign
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId,
        status: 'IN_PROGRESS',
      },
    });

    logger.info('Ticket assigned', { ticketId: id, assignedToId, assignedBy: req.user.id });

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    logger.error('Assign ticket error:', { error: error.message, ticketId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to assign ticket',
    });
  }
};

module.exports = exports;
