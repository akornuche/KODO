/**
 * Mock utilities for external services
 */

/**
 * Mock Stripe service
 */
const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123456789',
      client_secret: 'pi_test_123456789_secret_test',
      amount: 10000,
      currency: 'ngn',
      status: 'requires_payment_method'
    }),
    confirm: jest.fn().mockResolvedValue({
      id: 'pi_test_123456789',
      status: 'succeeded',
      amount: 10000,
      currency: 'ngn'
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_test_123456789',
      status: 'succeeded',
      amount: 10000,
      currency: 'ngn'
    })
  },
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_123456789',
      email: 'test@example.com'
    })
  }
};

/**
 * Mock Nodemailer transporter
 */
const mockMailTransporter = {
  sendMail: jest.fn().mockResolvedValue({
    messageId: '<test-message-id@example.com>',
    accepted: ['recipient@example.com'],
    rejected: [],
    response: '250 Message accepted'
  }),
  verify: jest.fn().mockResolvedValue(true)
};

/**
 * Mock Socket.IO
 */
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis()
};

const mockIo = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  sockets: {
    sockets: new Map()
  }
};

/**
 * Mock file upload (Multer)
 */
const mockMulterFile = {
  fieldname: 'image',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  destination: 'uploads/',
  filename: 'test-image-123456789.jpg',
  path: 'uploads/test-image-123456789.jpg',
  size: 1024000
};

/**
 * Mock Sharp image processing
 */
const mockSharp = jest.fn().mockReturnValue({
  resize: jest.fn().mockReturnThis(),
  toFormat: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue({
    format: 'jpeg',
    width: 800,
    height: 600,
    channels: 3,
    premultiplied: false,
    size: 102400
  })
});

/**
 * Mock Winston logger
 */
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

/**
 * Reset all mocks
 */
const resetAllMocks = () => {
  mockStripe.paymentIntents.create.mockClear();
  mockStripe.paymentIntents.confirm.mockClear();
  mockStripe.paymentIntents.retrieve.mockClear();
  mockStripe.customers.create.mockClear();
  mockMailTransporter.sendMail.mockClear();
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
  mockIo.emit.mockClear();
  mockSharp.mockClear();
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.debug.mockClear();
};

module.exports = {
  mockStripe,
  mockMailTransporter,
  mockSocket,
  mockIo,
  mockMulterFile,
  mockSharp,
  mockLogger,
  resetAllMocks
};
