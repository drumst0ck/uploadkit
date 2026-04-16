import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadBeam } from '../src/components/upload-beam';

// Mock matchMedia for theme detection
function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? prefersDark : !prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  return listeners;
}

describe('UploadBeam', () => {
  beforeEach(() => {
    mockMatchMedia(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <UploadBeam>
        <div data-testid="child">Hello</div>
      </UploadBeam>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });

  it('applies data-beam attribute with a unique id', () => {
    const { container } = render(
      <UploadBeam>
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper).not.toBeNull();
    const beamId = wrapper!.getAttribute('data-beam');
    expect(beamId).toBeTruthy();
    expect(beamId!.length).toBeGreaterThan(0);
  });

  it('sets data-active when state="uploading"', () => {
    const { container } = render(
      <UploadBeam state="uploading">
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper!.hasAttribute('data-active')).toBe(true);
    expect(wrapper!.hasAttribute('data-fading')).toBe(false);
  });

  it('sets data-active when active=true', () => {
    const { container } = render(
      <UploadBeam active>
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper!.hasAttribute('data-active')).toBe(true);
  });

  it('does not set data-active when state="idle"', () => {
    const { container } = render(
      <UploadBeam state="idle">
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper!.hasAttribute('data-active')).toBe(false);
  });

  it('sets data-fading when transitioning from uploading to complete', () => {
    const { container, rerender } = render(
      <UploadBeam state="uploading">
        <div>Content</div>
      </UploadBeam>,
    );

    // Transition to complete — hold for 1.5s then fade
    rerender(
      <UploadBeam state="complete">
        <div>Content</div>
      </UploadBeam>,
    );

    const wrapper = container.querySelector('[data-beam]');
    // Should still be active during hold period
    expect(wrapper!.hasAttribute('data-active')).toBe(true);

    // After 1.5s hold, should start fading
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(wrapper!.hasAttribute('data-fading')).toBe(true);
  });

  it('injects <style> with @property declaration', () => {
    const { container } = render(
      <UploadBeam state="uploading">
        <div>Content</div>
      </UploadBeam>,
    );
    const styleTag = container.parentElement!.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.textContent).toContain('@property');
    expect(styleTag!.textContent).toContain('syntax: "<angle>"');
  });

  it('renders the bloom element', () => {
    const { container } = render(
      <UploadBeam>
        <div>Content</div>
      </UploadBeam>,
    );
    const bloom = container.querySelector('[data-beam-bloom]');
    expect(bloom).not.toBeNull();
  });

  it('sets data-beam-state for complete and error', () => {
    const { container, rerender } = render(
      <UploadBeam state="complete">
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper!.getAttribute('data-beam-state')).toBe('complete');

    rerender(
      <UploadBeam state="error">
        <div>Content</div>
      </UploadBeam>,
    );
    expect(wrapper!.getAttribute('data-beam-state')).toBe('error');
  });

  it('applies custom className and style', () => {
    const { container } = render(
      <UploadBeam className="my-custom" style={{ padding: '8px' }}>
        <div>Content</div>
      </UploadBeam>,
    );
    const wrapper = container.querySelector('[data-beam]');
    expect(wrapper!.classList.contains('my-custom')).toBe(true);
    expect((wrapper as HTMLElement).style.padding).toBe('8px');
  });

  it('uses custom borderRadius when provided', () => {
    const { container } = render(
      <UploadBeam borderRadius={24} state="uploading">
        <div>Content</div>
      </UploadBeam>,
    );
    const styleTag = container.parentElement!.querySelector('style');
    expect(styleTag!.textContent).toContain('border-radius: 24px');
  });

  it('uses custom duration when provided', () => {
    const { container } = render(
      <UploadBeam duration={4} state="uploading">
        <div>Content</div>
      </UploadBeam>,
    );
    const styleTag = container.parentElement!.querySelector('style');
    expect(styleTag!.textContent).toContain('4s linear infinite');
  });
});
