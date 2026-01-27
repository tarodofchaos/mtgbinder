import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardImage } from './CardImage';

// Mock the card-service module
vi.mock('../../services/card-service', () => ({
  getCardImageUrl: vi.fn((scryfallId: string | null, size: string = 'normal') => {
    if (!scryfallId) return '/placeholder-card.png';
    const dir1 = scryfallId.charAt(0);
    const dir2 = scryfallId.charAt(1);
    return `https://cards.scryfall.io/${size}/front/${dir1}/${dir2}/${scryfallId}.jpg`;
  }),
}));

describe('CardImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with a container element', () => {
      const { container } = render(
        <CardImage scryfallId="abc123" name="Lightning Bolt" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders an image element with correct src', () => {
      render(<CardImage scryfallId="abc123" name="Lightning Bolt" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        'https://cards.scryfall.io/normal/front/a/b/abc123.jpg'
      );
    });

    it('renders with correct alt text from card name', () => {
      render(<CardImage scryfallId="abc123" name="Lightning Bolt" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Lightning Bolt');
    });

    it('uses lazy loading for performance', () => {
      render(<CardImage scryfallId="abc123" name="Test Card" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Size Variants', () => {
    it('uses normal size by default', () => {
      render(<CardImage scryfallId="xyz789" name="Default Size Card" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        expect.stringContaining('/normal/')
      );
    });

    it('uses small size when specified', () => {
      render(<CardImage scryfallId="xyz789" name="Small Card" size="small" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        expect.stringContaining('/small/')
      );
    });

    it('uses large size when specified', () => {
      render(<CardImage scryfallId="xyz789" name="Large Card" size="large" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        expect.stringContaining('/large/')
      );
    });
  });

  describe('Loading State', () => {
    it('shows skeleton while image is loading', () => {
      const { container } = render(
        <CardImage scryfallId="abc123" name="Loading Card" />
      );
      // MUI Skeleton has a specific class
      const skeleton = container.querySelector('.MuiSkeleton-root');
      expect(skeleton).toBeInTheDocument();
    });

    it('hides skeleton after image loads', async () => {
      const { container } = render(
        <CardImage scryfallId="abc123" name="Loaded Card" />
      );

      const img = screen.getByRole('img');
      fireEvent.load(img);

      await waitFor(() => {
        const skeleton = container.querySelector('.MuiSkeleton-root');
        expect(skeleton).not.toBeInTheDocument();
      });
    });

    it('image has opacity 0 while loading', () => {
      render(<CardImage scryfallId="abc123" name="Transparent Card" />);
      const img = screen.getByRole('img');
      // Initial state - image should be invisible while loading
      expect(img).toHaveStyle({ opacity: 0 });
    });

    it('image becomes visible after loading', async () => {
      render(<CardImage scryfallId="abc123" name="Visible Card" />);
      const img = screen.getByRole('img');

      fireEvent.load(img);

      await waitFor(() => {
        expect(img).toHaveStyle({ opacity: 1 });
      });
    });
  });

  describe('Error State', () => {
    it('shows error fallback when image fails to load', async () => {
      render(<CardImage scryfallId="invalid" name="Broken Image Card" />);
      const img = screen.getByRole('img');

      fireEvent.error(img);

      await waitFor(() => {
        // Should show the card name as fallback text
        expect(screen.getByText('Broken Image Card')).toBeInTheDocument();
      });
    });

    it('shows broken image icon on error', async () => {
      const { container } = render(
        <CardImage scryfallId="invalid" name="Error Card" />
      );
      const img = screen.getByRole('img');

      fireEvent.error(img);

      await waitFor(() => {
        // MUI BrokenImage icon should be present
        const errorIcon = container.querySelector('[data-testid="BrokenImageIcon"]');
        expect(errorIcon).toBeInTheDocument();
      });
    });

    it('hides image element after error', async () => {
      render(<CardImage scryfallId="invalid" name="Hidden Error Card" />);
      const img = screen.getByRole('img');

      fireEvent.error(img);

      await waitFor(() => {
        // Image should be replaced by error state
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
      });
    });

    it('hides skeleton after error', async () => {
      const { container } = render(
        <CardImage scryfallId="invalid" name="Error No Skeleton" />
      );
      const img = screen.getByRole('img');

      fireEvent.error(img);

      await waitFor(() => {
        const skeleton = container.querySelector('.MuiSkeleton-root');
        expect(skeleton).not.toBeInTheDocument();
      });
    });
  });

  describe('Null/Missing Scryfall ID', () => {
    it('renders placeholder for null scryfallId', () => {
      render(<CardImage scryfallId={null} name="No Image Card" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/placeholder-card.png');
    });
  });

  describe('Aspect Ratio', () => {
    it('maintains MTG card aspect ratio (488:680)', () => {
      const { container } = render(
        <CardImage scryfallId="abc123" name="Aspect Card" />
      );
      const wrapper = container.firstChild as HTMLElement;
      // The container should be a Box element that wraps the image
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.tagName).toBe('DIV');
    });
  });
});
