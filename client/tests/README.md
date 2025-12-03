# Frontend Testing Guide

## Overview

This project uses **Vitest** for unit and component testing, and **Playwright** for end-to-end (E2E) testing.

## Testing Stack

- **Vitest**: Fast unit test framework with Vue Test Utils integration
- **@vue/test-utils**: Official testing utilities for Vue.js
- **Happy-DOM**: Lightweight DOM implementation for component testing
- **Playwright**: Modern E2E testing framework supporting multiple browsers

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in specific browser
npx playwright test --project=chromium
```

## Test Structure

```
tests/
├── unit/               # Component and service unit tests
│   ├── App.spec.js
│   ├── HelloWorld.spec.js
│   └── api.spec.js
├── e2e/                # End-to-end tests
│   └── main.spec.js
└── setup.js            # Global test configuration
```

## Writing Unit Tests

### Component Tests

```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(MyComponent, {
      props: { msg: 'Hello' }
    });
    expect(wrapper.text()).toContain('Hello');
  });

  it('handles click events', async () => {
    const wrapper = mount(MyComponent);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });
});
```

### Service/API Tests

```javascript
import { describe, it, expect, vi } from 'vitest';
import api from '@/services/api';

describe('API Service', () => {
  it('makes GET requests', async () => {
    const mockData = { data: { id: 1 } };
    vi.spyOn(api, 'get').mockResolvedValue(mockData);
    
    const result = await api.get('/endpoint');
    expect(result.data.id).toBe(1);
  });
});
```

## Writing E2E Tests

### Basic Navigation

```javascript
import { test, expect } from '@playwright/test';

test('should navigate to products page', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Products');
  await expect(page).toHaveURL(/.*products/);
});
```

### User Interactions

```javascript
test('should complete checkout flow', async ({ page }) => {
  await page.goto('/products/1');
  await page.click('button:has-text("Buy Now")');
  await page.fill('[name="address"]', '123 Main St');
  await page.click('button:has-text("Place Order")');
  await expect(page.getByText('Order Placed')).toBeVisible();
});
```

## Test Coverage

### Current Coverage

- **Unit Tests**: 3 test files, 20+ assertions
  - App.vue component
  - HelloWorld.vue component
  - API service configuration

- **E2E Tests**: 1 test file with multiple scenarios
  - Basic navigation
  - Authentication flow (skipped - to be implemented)
  - Product browsing (skipped - to be implemented)
  - Order flow (skipped - to be implemented)
  - Delivery tracking (skipped - to be implemented)

### Coverage Goals

- **Components**: 70%+ coverage
- **Services**: 80%+ coverage
- **Critical User Flows**: 100% E2E coverage

## Best Practices

### Unit Tests

1. **Test behavior, not implementation**
   - Focus on what the component does, not how it does it
   - Test user interactions and expected outputs

2. **Mock external dependencies**
   - Mock API calls, routers, and external services
   - Use `vi.mock()` for module mocking

3. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` to reset state

4. **Write descriptive test names**
   - Use clear, action-oriented descriptions
   - Follow "should [do something] when [condition]" pattern

### E2E Tests

1. **Test critical user journeys**
   - Authentication
   - Product purchase
   - Order tracking
   - Payment flows

2. **Use data-testid attributes**
   - Add `data-testid` to elements for stable selectors
   - Avoid relying on CSS classes or text

3. **Handle async operations**
   - Use `waitFor` for dynamic content
   - Handle loading states explicitly

4. **Test across browsers**
   - Run tests in Chrome, Firefox, and Safari
   - Check for cross-browser compatibility

## Configuration

### Vitest Configuration

See `vitest.config.js` for:
- Test environment (happy-dom)
- Coverage settings
- Global test utilities
- Path aliases

### Playwright Configuration

See `playwright.config.js` for:
- Browser configurations
- Base URL settings
- Retry policies
- Screenshot/trace options

## Debugging Tests

### Vitest Debugging

```bash
# Run specific test file
npm run test HelloWorld.spec.js

# Run with debug output
DEBUG=true npm run test

# Use Vitest UI for interactive debugging
npm run test:ui
```

### Playwright Debugging

```bash
# Run with headed browser
npx playwright test --headed

# Debug specific test
npx playwright test --debug main.spec.js

# Use Playwright Inspector
npm run test:e2e:ui
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Unit Tests
  run: npm run test:coverage

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check for unresolved promises

2. **Mock not working**
   - Ensure mocks are set up before imports
   - Clear mocks between tests with `vi.clearAllMocks()`

3. **E2E tests failing**
   - Ensure dev server is running
   - Check network conditions
   - Verify element selectors

4. **Coverage not accurate**
   - Check coverage exclude patterns
   - Ensure all test files are discovered

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Documentation](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
