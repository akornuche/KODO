const axios = require('axios');
const logger = require('./logger');

/**
 * SMS Service for Nigerian providers
 * Supports Termii and BulkSMS as fallback options
 */

class SMSService {
  constructor() {
    this.providers = {
      termii: {
        baseUrl: 'https://api.ng.termii.com/api',
        apiKey: process.env.TERMII_API_KEY,
        senderId: process.env.TERMII_SENDER_ID || 'KODO',
        enabled: !!process.env.TERMII_API_KEY,
      },
      bulksms: {
        baseUrl: 'https://api.bulksmsnigeria.com/api/v1/sms/create',
        apiKey: process.env.BULKSMS_API_KEY,
        username: process.env.BULKSMS_USERNAME,
        senderId: process.env.BULKSMS_SENDER_ID || 'KODO',
        enabled: !!process.env.BULKSMS_API_KEY && !!process.env.BULKSMS_USERNAME,
      },
    };

    // Determine primary provider (Termii preferred for Nigerian market)
    this.primaryProvider = this.providers.termii.enabled ? 'termii' : 'bulksms';
    this.fallbackProvider = this.primaryProvider === 'termii' ? 'bulksms' : 'termii';

    logger.info('SMS Service initialized', {
      primaryProvider: this.primaryProvider,
      fallbackProvider: this.fallbackProvider,
      termiiEnabled: this.providers.termii.enabled,
      bulksmsEnabled: this.providers.bulksms.enabled,
    });
  }

  /**
   * Send SMS using primary provider with fallback
   * @param {string} phoneNumber - Nigerian phone number (with or without +234)
   * @param {string} message - SMS message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(phoneNumber, message, options = {}) {
    // Format phone number to Nigerian format
    const formattedNumber = this.formatNigerianNumber(phoneNumber);

    if (!formattedNumber) {
      throw new Error('Invalid Nigerian phone number');
    }

    // Try primary provider first
    try {
      const result = await this.sendWithProvider(this.primaryProvider, formattedNumber, message, options);
      logger.info('SMS sent successfully', {
        provider: this.primaryProvider,
        phoneNumber: formattedNumber,
        messageLength: message.length,
      });
      return result;
    } catch (error) {
      logger.warn('Primary SMS provider failed, trying fallback', {
        primaryProvider: this.primaryProvider,
        error: error.message,
      });

      // Try fallback provider
      if (this.providers[this.fallbackProvider].enabled) {
        try {
          const result = await this.sendWithProvider(this.fallbackProvider, formattedNumber, message, options);
          logger.info('SMS sent successfully with fallback provider', {
            provider: this.fallbackProvider,
            phoneNumber: formattedNumber,
            messageLength: message.length,
          });
          return result;
        } catch (fallbackError) {
          logger.error('Both SMS providers failed', {
            primaryError: error.message,
            fallbackError: fallbackError.message,
          });
          throw new Error('SMS delivery failed with both providers');
        }
      } else {
        logger.error('SMS delivery failed - no fallback provider available', {
          error: error.message,
        });
        throw error;
      }
    }
  }

  /**
   * Send SMS with specific provider
   * @param {string} provider - Provider name ('termii' or 'bulksms')
   * @param {string} phoneNumber - Formatted phone number
   * @param {string} message - SMS message
   * @param {Object} options - Additional options
   */
  async sendWithProvider(provider, phoneNumber, message, options = {}) {
    const providerConfig = this.providers[provider];

    if (!providerConfig.enabled) {
      throw new Error(`${provider} provider not configured`);
    }

    switch (provider) {
      case 'termii':
        return await this.sendWithTermii(phoneNumber, message, options);
      case 'bulksms':
        return await this.sendWithBulkSMS(phoneNumber, message, options);
      default:
        throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }

  /**
   * Send SMS via Termii
   */
  async sendWithTermii(phoneNumber, message, options) {
    const { termii } = this.providers;

    const payload = {
      to: phoneNumber,
      from: termii.senderId,
      sms: message,
      type: 'plain',
      channel: 'generic',
      ...options,
    };

    try {
      const response = await axios.post(
        `${termii.baseUrl}/sms/send`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${termii.apiKey}`,
          },
          timeout: 30000, // 30 seconds
        }
      );

      if (response.data.code !== 'ok') {
        throw new Error(`Termii API error: ${response.data.message}`);
      }

      return {
        success: true,
        provider: 'termii',
        messageId: response.data.message_id,
        status: response.data.status,
        balance: response.data.balance,
      };

    } catch (error) {
      logger.error('Termii SMS send error:', {
        phoneNumber,
        error: error.response?.data || error.message,
      });
      throw new Error(`Termii SMS failed: ${error.message}`);
    }
  }

  /**
   * Send SMS via BulkSMS Nigeria
   */
  async sendWithBulkSMS(phoneNumber, message, options) {
    const { bulksms } = this.providers;

    const payload = {
      api_token: bulksms.apiKey,
      from: bulksms.senderId,
      to: phoneNumber,
      body: message,
      dnd: 1, // Comply with DND regulations
      ...options,
    };

    try {
      const response = await axios.post(
        bulksms.baseUrl,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.data.status !== 'success') {
        throw new Error(`BulkSMS API error: ${response.data.message || 'Unknown error'}`);
      }

      return {
        success: true,
        provider: 'bulksms',
        messageId: response.data.data?.id,
        status: response.data.data?.status,
        balance: response.data.data?.balance,
      };

    } catch (error) {
      logger.error('BulkSMS send error:', {
        phoneNumber,
        error: error.response?.data || error.message,
      });
      throw new Error(`BulkSMS failed: ${error.message}`);
    }
  }

  /**
   * Format phone number to Nigerian format
   * @param {string} phoneNumber - Input phone number
   * @returns {string|null} Formatted number or null if invalid
   */
  formatNigerianNumber(phoneNumber) {
    if (!phoneNumber) return null;

    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('234')) {
      // Already in international format
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      // Local format, replace 0 with 234
      return `+234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      // Assume it's a 10-digit Nigerian number
      return `+234${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // 11-digit with leading 0
      return `+234${cleaned.substring(1)}`;
    }

    // Invalid format
    return null;
  }

  /**
   * Check if phone number is valid Nigerian number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid Nigerian number
   */
  isValidNigerianNumber(phoneNumber) {
    const formatted = this.formatNigerianNumber(phoneNumber);
    return formatted !== null && formatted.startsWith('+234') && formatted.length === 14;
  }

  /**
   * Get SMS delivery status
   * @param {string} messageId - Message ID from send response
   * @param {string} provider - SMS provider used
   */
  async getDeliveryStatus(messageId, provider) {
    // Implementation would depend on provider APIs
    // This is a placeholder for future implementation
    logger.info('Delivery status check requested', { messageId, provider });
    return { status: 'unknown', messageId, provider };
  }

  /**
   * Send bulk SMS (for marketing campaigns)
   * @param {Array} recipients - Array of phone numbers
   * @param {string} message - SMS message
   * @param {Object} options - Additional options
   */
  async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    const errors = [];

    logger.info('Starting bulk SMS send', {
      recipientCount: recipients.length,
      messageLength: message.length,
    });

    // Send SMS to each recipient (with rate limiting)
    for (const phoneNumber of recipients) {
      try {
        const result = await this.sendSMS(phoneNumber, message, options);
        results.push({ phoneNumber, ...result });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errors.push({ phoneNumber, error: error.message });
        logger.warn('Bulk SMS failed for recipient', {
          phoneNumber,
          error: error.message,
        });
      }
    }

    logger.info('Bulk SMS completed', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
    });

    return {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}

module.exports = new SMSService();