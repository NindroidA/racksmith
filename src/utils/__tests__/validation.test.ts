import {
  validateEmail,
  validatePassword,
  validateName,
  validatePasswordMatch,
  getPasswordStrength,
} from '../validation';

describe('validateEmail', () => {
  it('should return valid for correct email format', () => {
    expect(validateEmail('test@example.com')).toEqual({ isValid: true });
    expect(validateEmail('user.name+tag@example.co.uk')).toEqual({ isValid: true });
  });

  it('should return error for empty email', () => {
    expect(validateEmail('')).toEqual({
      isValid: false,
      error: 'Email is required',
    });
  });

  it('should return error for invalid email format', () => {
    expect(validateEmail('invalid')).toEqual({
      isValid: false,
      error: 'Invalid email format',
    });
    expect(validateEmail('invalid@')).toEqual({
      isValid: false,
      error: 'Invalid email format',
    });
    expect(validateEmail('@example.com')).toEqual({
      isValid: false,
      error: 'Invalid email format',
    });
    expect(validateEmail('test@')).toEqual({
      isValid: false,
      error: 'Invalid email format',
    });
  });
});

describe('validatePassword', () => {
  it('should return valid for strong password', () => {
    expect(validatePassword('StrongPass123')).toEqual({ isValid: true });
    expect(validatePassword('MyP@ssw0rd')).toEqual({ isValid: true });
  });

  it('should return error for empty password', () => {
    expect(validatePassword('')).toEqual({
      isValid: false,
      error: 'Password is required',
    });
  });

  it('should return error for password less than 8 characters', () => {
    expect(validatePassword('Short1')).toEqual({
      isValid: false,
      error: 'Password must be at least 8 characters',
    });
  });

  it('should return error for password without uppercase letter', () => {
    expect(validatePassword('lowercase123')).toEqual({
      isValid: false,
      error: 'Password must contain an uppercase letter',
    });
  });

  it('should return error for password without lowercase letter', () => {
    expect(validatePassword('UPPERCASE123')).toEqual({
      isValid: false,
      error: 'Password must contain a lowercase letter',
    });
  });

  it('should return error for password without number', () => {
    expect(validatePassword('NoNumbersHere')).toEqual({
      isValid: false,
      error: 'Password must contain a number',
    });
  });
});

describe('validateName', () => {
  it('should return valid for correct name', () => {
    expect(validateName('John Doe')).toEqual({ isValid: true });
    expect(validateName('Alice')).toEqual({ isValid: true });
  });

  it('should return error for empty name', () => {
    expect(validateName('')).toEqual({
      isValid: false,
      error: 'Name is required',
    });
    expect(validateName('   ')).toEqual({
      isValid: false,
      error: 'Name is required',
    });
  });

  it('should return error for name less than 2 characters', () => {
    expect(validateName('A')).toEqual({
      isValid: false,
      error: 'Name must be at least 2 characters',
    });
  });

  it('should return error for name more than 50 characters', () => {
    const longName = 'A'.repeat(51);
    expect(validateName(longName)).toEqual({
      isValid: false,
      error: 'Name must be less than 50 characters',
    });
  });
});

describe('validatePasswordMatch', () => {
  it('should return valid when passwords match', () => {
    expect(validatePasswordMatch('password123', 'password123')).toEqual({
      isValid: true,
    });
  });

  it('should return error for empty confirm password', () => {
    expect(validatePasswordMatch('password123', '')).toEqual({
      isValid: false,
      error: 'Please confirm your password',
    });
  });

  it('should return error when passwords do not match', () => {
    expect(validatePasswordMatch('password123', 'password456')).toEqual({
      isValid: false,
      error: 'Passwords do not match',
    });
  });
});

describe('getPasswordStrength', () => {
  it('should return weak for simple passwords', () => {
    expect(getPasswordStrength('pass')).toBe('weak');
    expect(getPasswordStrength('password')).toBe('weak');
  });

  it('should return medium for moderately complex passwords', () => {
    expect(getPasswordStrength('Password1')).toBe('medium');
    expect(getPasswordStrength('shortpw1')).toBe('medium');
  });

  it('should return strong for complex passwords', () => {
    expect(getPasswordStrength('MyP@ssw0rd!2023')).toBe('strong');
    expect(getPasswordStrength('Str0ng!P@ssword')).toBe('strong');
  });

  it('should consider length in strength calculation', () => {
    expect(getPasswordStrength('Aa1')).toBe('medium'); // Short but has upper, lower, number
    expect(getPasswordStrength('Aa1Aa1Aa1')).toBe('medium'); // Longer with upper, lower, number
    expect(getPasswordStrength('Aa1Aa1Aa1Aa1!')).toBe('strong'); // Long with special char
  });
});
