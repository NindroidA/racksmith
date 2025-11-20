import { render, screen } from '@testing-library/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with default classes', () => {
      render(<Card data-testid="card">Card Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('rounded-xl');
    });

    it('should accept custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Card ref={ref as any}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardHeader', () => {
    it('should render with flex column layout', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });

    it('should accept custom className', () => {
      render(<CardHeader className="custom-class" data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-class');
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 with correct styles', () => {
      render(<CardTitle>Card Title</CardTitle>);
      const title = screen.getByRole('heading', { name: /card title/i });
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-white');
    });

    it('should accept custom className', () => {
      render(<CardTitle className="custom-class">Title</CardTitle>);
      const title = screen.getByRole('heading', { name: /title/i });
      expect(title).toHaveClass('custom-class');
    });
  });

  describe('CardDescription', () => {
    it('should render with correct text styles', () => {
      render(<CardDescription>Card description text</CardDescription>);
      const description = screen.getByText(/card description text/i);
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-gray-400');
    });

    it('should accept custom className', () => {
      render(<CardDescription className="custom-class">Description</CardDescription>);
      const description = screen.getByText(/description/i);
      expect(description).toHaveClass('custom-class');
    });
  });

  describe('CardContent', () => {
    it('should render children correctly', () => {
      render(<CardContent data-testid="content">Content text</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Content text');
    });

    it('should accept custom className', () => {
      render(<CardContent className="p-6" data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
    });
  });

  describe('CardFooter', () => {
    it('should render with flex layout', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
    });

    it('should accept custom className', () => {
      render(<CardFooter className="justify-end" data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('justify-end');
    });
  });

  describe('Complete Card', () => {
    it('should render a complete card with all sub-components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
      expect(screen.getByText(/test description/i)).toBeInTheDocument();
      expect(screen.getByText(/card content goes here/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });
});
