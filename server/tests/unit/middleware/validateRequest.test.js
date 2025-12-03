const { handleValidationErrors } = require('../../../middleware/validateRequest');
const { validationResult } = require('express-validator');

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should call next() when no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const mockErrors = [
        { path: 'email', msg: 'Invalid email', value: 'invalid' },
        { path: 'password', msg: 'Password too short', value: '123' },
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'email', message: 'Invalid email', value: 'invalid' },
          { field: 'password', message: 'Password too short', value: '123' },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors with param instead of path', () => {
      const mockErrors = [
        { param: 'username', msg: 'Username required', value: undefined },
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'username', message: 'Username required', value: undefined },
        ],
      });
    });

    it('should handle multiple validation errors', () => {
      const mockErrors = [
        { path: 'field1', msg: 'Error 1', value: 'val1' },
        { path: 'field2', msg: 'Error 2', value: 'val2' },
        { path: 'field3', msg: 'Error 3', value: 'val3' },
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      handleValidationErrors(req, res, next);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.details).toHaveLength(3);
    });
  });
});
