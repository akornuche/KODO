import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from '../../src/App.vue';

// Mock router-view component
const RouterViewMock = {
  name: 'RouterView',
  template: '<div class="router-view-mock"><slot /></div>',
};

// Mock the auth store
vi.mock('../../src/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  }),
}));

// Mock the helpers
vi.mock('../../src/utils/helpers', () => ({
  getRoleColor: () => 'primary',
}));

describe('App.vue', () => {
  beforeEach(() => {
    // Create and set active Pinia instance
    const pinia = createPinia();
    setActivePinia(pinia);
  });

  it('renders without crashing', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: RouterViewMock,
        },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('contains router-view component', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: RouterViewMock,
        },
      },
    });
    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true);
  });

  it('renders router content', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div class="router-content">Test Content</div>',
          },
        },
      },
    });
    expect(wrapper.html()).toContain('Test Content');
  });

  it('has correct structure', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: RouterViewMock,
        },
      },
    });
    
    // App should be a valid Vue component
    expect(wrapper.vm).toBeDefined();
  });
});
