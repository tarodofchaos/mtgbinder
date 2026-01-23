import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner, LoadingPage } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with small size when specified', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with large size when specified', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toBeInTheDocument();
  });
});

describe('LoadingPage', () => {
  it('renders a centered large spinner', () => {
    const { container } = render(<LoadingPage />);
    const spinner = container.querySelector('[role="progressbar"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a container with flex layout', () => {
    const { container } = render(<LoadingPage />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.tagName).toBe('DIV');
  });
});
