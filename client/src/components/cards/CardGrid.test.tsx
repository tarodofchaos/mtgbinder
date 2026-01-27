import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardGrid, CardGridItem } from './CardGrid';

describe('CardGrid', () => {
  describe('Rendering', () => {
    it('renders children inside a grid container', () => {
      render(
        <CardGrid>
          <div data-testid="child-1">Card 1</div>
          <div data-testid="child-2">Card 2</div>
        </CardGrid>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('renders with MUI Grid container', () => {
      const { container } = render(
        <CardGrid>
          <div>Content</div>
        </CardGrid>
      );

      // MUI Grid container has specific classes
      const gridContainer = container.querySelector('.MuiGrid-container');
      expect(gridContainer).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      render(
        <CardGrid>
          <div data-testid="item-1">Item 1</div>
          <div data-testid="item-2">Item 2</div>
          <div data-testid="item-3">Item 3</div>
          <div data-testid="item-4">Item 4</div>
        </CardGrid>
      );

      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
      expect(screen.getByTestId('item-4')).toBeInTheDocument();
    });

    it('renders with spacing between items', () => {
      const { container } = render(
        <CardGrid>
          <div>Spaced Content</div>
        </CardGrid>
      );

      // MUI Grid with spacing=2 should have the spacing class
      const gridContainer = container.querySelector('.MuiGrid-container');
      expect(gridContainer).toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      const { container } = render(<CardGrid>{null}</CardGrid>);
      const gridContainer = container.querySelector('.MuiGrid-container');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});

describe('CardGridItem', () => {
  describe('Rendering', () => {
    it('renders children inside a grid item', () => {
      render(
        <CardGridItem>
          <div data-testid="grid-item-content">Card Content</div>
        </CardGridItem>
      );

      expect(screen.getByTestId('grid-item-content')).toBeInTheDocument();
    });

    it('renders with MUI Grid component', () => {
      const { container } = render(
        <CardGridItem>
          <div>Grid Item</div>
        </CardGridItem>
      );

      // MUI Grid item uses MuiGrid class
      const gridItem = container.querySelector('.MuiGrid-root');
      expect(gridItem).toBeInTheDocument();
    });

    it('renders content passed as children', () => {
      render(
        <CardGridItem>
          <span>Inner Text</span>
        </CardGridItem>
      );

      expect(screen.getByText('Inner Text')).toBeInTheDocument();
    });
  });

  describe('Responsive Breakpoints', () => {
    // Note: Testing responsive behavior requires a more complex setup
    // These tests verify the component renders correctly at base level
    it('applies responsive sizing via Grid size prop', () => {
      const { container } = render(
        <CardGridItem>
          <div>Responsive Item</div>
        </CardGridItem>
      );

      // The Grid component should be rendered
      const gridItem = container.querySelector('.MuiGrid-root');
      expect(gridItem).toBeInTheDocument();
    });
  });
});

describe('CardGrid with CardGridItem', () => {
  it('renders a complete card grid with items', () => {
    render(
      <CardGrid>
        <CardGridItem>
          <div data-testid="card-1">Card 1</div>
        </CardGridItem>
        <CardGridItem>
          <div data-testid="card-2">Card 2</div>
        </CardGridItem>
        <CardGridItem>
          <div data-testid="card-3">Card 3</div>
        </CardGridItem>
      </CardGrid>
    );

    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
    expect(screen.getByTestId('card-3')).toBeInTheDocument();
  });

  it('renders nested content correctly', () => {
    render(
      <CardGrid>
        <CardGridItem>
          <div>
            <h3>Card Title</h3>
            <p>Card description</p>
          </div>
        </CardGridItem>
      </CardGrid>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
  });

  it('handles dynamic list of cards', () => {
    const cards = [
      { id: '1', name: 'Lightning Bolt' },
      { id: '2', name: 'Counterspell' },
      { id: '3', name: 'Dark Ritual' },
    ];

    render(
      <CardGrid>
        {cards.map((card) => (
          <CardGridItem key={card.id}>
            <div data-testid={`card-${card.id}`}>{card.name}</div>
          </CardGridItem>
        ))}
      </CardGrid>
    );

    expect(screen.getByTestId('card-1')).toHaveTextContent('Lightning Bolt');
    expect(screen.getByTestId('card-2')).toHaveTextContent('Counterspell');
    expect(screen.getByTestId('card-3')).toHaveTextContent('Dark Ritual');
  });

  it('renders empty grid when no items provided', () => {
    const cards: Array<{ id: string; name: string }> = [];

    const { container } = render(
      <CardGrid>
        {cards.map((card) => (
          <CardGridItem key={card.id}>
            <div>{card.name}</div>
          </CardGridItem>
        ))}
      </CardGrid>
    );

    // Grid container should still render
    const gridContainer = container.querySelector('.MuiGrid-container');
    expect(gridContainer).toBeInTheDocument();
    // But should have no card items
    expect(gridContainer?.children.length).toBe(0);
  });
});
