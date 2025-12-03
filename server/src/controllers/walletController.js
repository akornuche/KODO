const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { generateReference } = require('../lib/utils');

/**
 * Wallet Controller
 * Handles wallet operations: balance, deposits, withdrawals, transfers
 */

/**
 * Get wallet balance and info
 * GET /api/wallet
 */
exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    // Create wallet if doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          lockedBalance: 0,
          totalEarnings: 0,
          totalSpent: 0,
        },
      });
    }

    res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    logger.error('Get wallet error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve wallet',
    });
  }
};

/**
 * Get transaction history
 * GET /api/wallet/transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error('Get transactions error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve transactions',
    });
  }
};

/**
 * Deposit funds to wallet
 * POST /api/wallet/deposit
 */
exports.depositFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod = 'card', paymentProvider = 'stripe' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid amount',
      });
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
      });
    }

    const reference = generateReference('DEP');

    // Create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'deposit',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        reference,
        description: `Wallet deposit of ${amount} NGN`,
        status: 'pending',
        paymentMethod,
        paymentProvider,
      },
    });

    // TODO: Integrate with payment gateway (Stripe/Flutterwave)
    // For now, simulate successful payment

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
      },
    });

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        balanceAfter: updatedWallet.balance,
      },
    });

    logger.info('Wallet deposit successful', {
      userId,
      amount,
      reference,
      newBalance: updatedWallet.balance,
    });

    res.json({
      success: true,
      message: 'Deposit successful',
      transaction,
      wallet: updatedWallet,
    });
  } catch (error) {
    logger.error('Deposit funds error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to deposit funds',
    });
  }
};

/**
 * Withdraw funds from wallet
 * POST /api/wallet/withdraw
 */
exports.withdrawFunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankAccount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid amount',
      });
    }

    if (!bankAccount) {
      return res.status(400).json({
        error: true,
        message: 'Bank account details required',
      });
    }

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(400).json({
        error: true,
        message: 'Wallet not found',
      });
    }

    // Check balance
    const availableBalance = wallet.balance - wallet.lockedBalance;
    if (amount > availableBalance) {
      return res.status(400).json({
        error: true,
        message: 'Insufficient balance',
        availableBalance,
      });
    }

    const reference = generateReference('WTH');

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'withdrawal',
        amount: -amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        reference,
        description: `Withdrawal of ${amount} NGN`,
        status: 'processing',
        metadata: { bankAccount },
      },
    });

    // Update wallet balance
    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
      },
    });

    logger.info('Withdrawal initiated', {
      userId,
      amount,
      reference,
      newBalance: updatedWallet.balance,
    });

    // TODO: Process actual bank transfer via Flutterwave
    // Update transaction status after successful transfer

    res.json({
      success: true,
      message: 'Withdrawal initiated',
      transaction,
      wallet: updatedWallet,
    });
  } catch (error) {
    logger.error('Withdraw funds error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to withdraw funds',
    });
  }
};

/**
 * Transfer funds between wallets
 * POST /api/wallet/transfer
 */
exports.transferFunds = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId, amount, note } = req.body;

    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid transfer details',
      });
    }

    if (senderId === recipientId) {
      return res.status(400).json({
        error: true,
        message: 'Cannot transfer to yourself',
      });
    }

    // Check recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return res.status(404).json({
        error: true,
        message: 'Recipient not found',
      });
    }

    // Get sender wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({
        error: true,
        message: 'Insufficient balance',
      });
    }

    // Get or create recipient wallet
    let recipientWallet = await prisma.wallet.findUnique({
      where: { userId: recipientId },
    });

    if (!recipientWallet) {
      recipientWallet = await prisma.wallet.create({
        data: { userId: recipientId },
      });
    }

    const reference = generateReference('TRF');

    // Execute transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Debit sender
      const updatedSenderWallet = await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amount } },
      });

      // Create sender transaction
      const senderTx = await tx.transaction.create({
        data: {
          userId: senderId,
          type: 'wallet_transfer',
          amount: -amount,
          balanceBefore: senderWallet.balance,
          balanceAfter: updatedSenderWallet.balance,
          reference,
          description: `Transfer to ${recipient.username}`,
          status: 'completed',
          metadata: { recipientId, note },
        },
      });

      // Credit recipient
      const updatedRecipientWallet = await tx.wallet.update({
        where: { userId: recipientId },
        data: { balance: { increment: amount } },
      });

      // Create recipient transaction
      const recipientTx = await tx.transaction.create({
        data: {
          userId: recipientId,
          type: 'wallet_transfer',
          amount,
          balanceBefore: recipientWallet.balance,
          balanceAfter: updatedRecipientWallet.balance,
          reference,
          description: `Transfer from ${req.user.username}`,
          status: 'completed',
          metadata: { senderId, note },
        },
      });

      return {
        senderWallet: updatedSenderWallet,
        recipientWallet: updatedRecipientWallet,
        senderTransaction: senderTx,
        recipientTransaction: recipientTx,
      };
    });

    logger.info('Wallet transfer successful', {
      senderId,
      recipientId,
      amount,
      reference,
    });

    res.json({
      success: true,
      message: 'Transfer successful',
      transaction: result.senderTransaction,
      wallet: result.senderWallet,
    });
  } catch (error) {
    logger.error('Transfer funds error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to transfer funds',
    });
  }
};

/**
 * Process refund to wallet (internal use)
 */
exports.processRefund = async (orderId, userId, amount, description) => {
  try {
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
      });
    }

    const reference = generateReference('RFD');

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'order_refund',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        reference,
        description: description || `Refund for order ${orderId}`,
        status: 'completed',
        metadata: { orderId },
      },
    });

    // Update wallet
    const updatedWallet = await prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    logger.info('Refund processed to wallet', {
      userId,
      orderId,
      amount,
      reference,
    });

    return {
      success: true,
      transaction,
      wallet: updatedWallet,
    };
  } catch (error) {
    logger.error('Process refund error:', { error: error.message, userId, orderId });
    throw error;
  }
};

/**
 * Process seller payout (internal use)
 */
exports.processSellerPayout = async (sellerId, amount, orderId, commissionAmount) => {
  try {
    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId: sellerId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: sellerId },
      });
    }

    const netAmount = amount - commissionAmount;
    const reference = generateReference('PAY');

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create seller payout transaction
      const payoutTx = await tx.transaction.create({
        data: {
          userId: sellerId,
          type: 'seller_payout',
          amount: netAmount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance + netAmount,
          reference,
          description: `Payout for order ${orderId}`,
          status: 'completed',
          metadata: { orderId, grossAmount: amount, commission: commissionAmount },
        },
      });

      // Create commission transaction
      const commissionTx = await tx.transaction.create({
        data: {
          userId: sellerId,
          type: 'commission_fee',
          amount: -commissionAmount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance,
          reference: `${reference}-COM`,
          description: `Commission for order ${orderId}`,
          status: 'completed',
          metadata: { orderId, payoutReference: reference },
        },
      });

      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId: sellerId },
        data: {
          balance: { increment: netAmount },
          totalEarnings: { increment: netAmount },
        },
      });

      return { payoutTx, commissionTx, wallet: updatedWallet };
    });

    logger.info('Seller payout processed', {
      sellerId,
      orderId,
      amount,
      commissionAmount,
      netAmount,
      reference,
    });

    return result;
  } catch (error) {
    logger.error('Process seller payout error:', { error: error.message, sellerId, orderId });
    throw error;
  }
};

module.exports = exports;
