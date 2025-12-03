import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HelloWorld from '../../src/components/HelloWorld.vue';

describe('HelloWorld', () => {
  it('renders properly with msg prop', () => {
    const msg = 'Hello Vitest';
    const wrapper = mount(HelloWorld, { props: { msg } });
    expect(wrapper.text()).toContain(msg);
  });

  it('displays initial count of 0', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Test' } });
    expect(wrapper.text()).toContain('count is 0');
  });

  it('increments count when button is clicked', async () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Test' } });
    const button = wrapper.find('button');
    
    await button.trigger('click');
    expect(wrapper.text()).toContain('count is 1');
    
    await button.trigger('click');
    expect(wrapper.text()).toContain('count is 2');
  });

  it('contains links to Vue resources', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Test' } });
    const links = wrapper.findAll('a');
    
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].attributes('href')).toContain('vuejs.org');
  });

  it('has a card with button', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Test' } });
    const card = wrapper.find('.card');
    const button = card.find('button');
    
    expect(card.exists()).toBe(true);
    expect(button.exists()).toBe(true);
  });
});
