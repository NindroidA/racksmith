import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
  it('should render with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('glass-button');
    expect(button).toHaveClass('h-11');
  });

  it('should render with gradient variant', () => {
    render(<Button variant="gradient">Gradient Button</Button>);
    const button = screen.getByRole('button', { name: /gradient button/i });
    expect(button).toHaveClass('bg-gradient-to-r');
  });

  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('glass');
    expect(button).toHaveClass('border-2');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole('button', { name: /ghost button/i });
    expect(button).toHaveClass('hover:bg-white/10');
  });

  it('should render with small size', () => {
    render(<Button size="sm">Small Button</Button>);
    const button = screen.getByRole('button', { name: /small button/i });
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('px-4');
  });

  it('should render with large size', () => {
    render(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button', { name: /large button/i });
    expect(button).toHaveClass('h-12');
    expect(button).toHaveClass('px-8');
  });

  it('should render with icon size', () => {
    render(<Button size="icon" aria-label="Icon button">+</Button>);
    const button = screen.getByRole('button', { name: /icon button/i });
    expect(button).toHaveClass('h-11');
    expect(button).toHaveClass('w-11');
  });

  it('should handle click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Clickable</Button>);
    const button = screen.getByRole('button', { name: /clickable/i });

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref as any}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('should render with custom type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
  });
});
