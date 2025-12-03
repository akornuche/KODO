/**
 * Test assertion helpers for standardized API responses
 */

/**
 * Assert error response format
 * Actual API returns: { error: true, message: string, code: string, requestId?: string }
 */
function expectErrorResponse(res, statusCode, message, code) {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall.error).toBe(true);
  expect(jsonCall.message).toMatch(message);
  
  if (code) {
    expect(jsonCall.code).toBe(code);
  }
}

/**
 * Assert success response format
 * Most endpoints return: { message?: string, data: object }
 * Some return: { message: string, user/product/etc: object }
 */
function expectSuccessResponse(res, statusCode) {
  if (statusCode) {
    expect(res.status).toHaveBeenCalledWith(statusCode);
  }
  
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall.error).not.toBe(true);
}

/**
 * Assert paginated response format
 */
function expectPaginatedResponse(res, expectedDataKey = 'data') {
  expectSuccessResponse(res);
  
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall[expectedDataKey]).toBeDefined();
  expect(jsonCall.pagination).toBeDefined();
  expect(jsonCall.pagination).toHaveProperty('page');
  expect(jsonCall.pagination).toHaveProperty('limit');
  expect(jsonCall.pagination).toHaveProperty('total');
  expect(jsonCall.pagination).toHaveProperty('pages');
}

module.exports = {
  expectErrorResponse,
  expectSuccessResponse,
  expectPaginatedResponse,
};
