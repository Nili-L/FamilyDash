import { describe, it, expect } from 'vitest';
import {
  validateFamilyMember,
  validateMedication,
  validateAppointment,
  validateTask,
  sanitizeInput,
  validateEmail,
  validatePhone,
} from './dataValidation';

describe('validateFamilyMember', () => {
  it('passes with valid data', () => {
    const result = validateFamilyMember({ name: 'Alice', color: '#ff0000' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('fails when name is missing', () => {
    const result = validateFamilyMember({ name: '', color: '#ff0000' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('fails when name is only whitespace', () => {
    const result = validateFamilyMember({ name: '   ', color: '#ff0000' });
    expect(result.isValid).toBe(false);
  });

  it('fails when name exceeds 50 characters', () => {
    const result = validateFamilyMember({ name: 'A'.repeat(51), color: '#ff0000' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toMatch(/50/);
  });

  it('fails when color is missing', () => {
    const result = validateFamilyMember({ name: 'Alice' });
    expect(result.isValid).toBe(false);
    expect(result.errors.color).toBeDefined();
  });
});

describe('validateMedication', () => {
  const valid = { name: 'Aspirin', person: 'member-1', time: '08:00' };

  it('passes with valid data', () => {
    expect(validateMedication(valid).isValid).toBe(true);
  });

  it('fails when name is missing', () => {
    expect(validateMedication({ ...valid, name: '' }).isValid).toBe(false);
  });

  it('fails when person is missing', () => {
    expect(validateMedication({ ...valid, person: '' }).isValid).toBe(false);
  });

  it('fails when time is missing', () => {
    expect(validateMedication({ ...valid, time: '' }).isValid).toBe(false);
  });
});

describe('validateAppointment', () => {
  const valid = { title: 'Checkup', person: 'member-1', date: '2026-05-01', time: '10:00' };

  it('passes with valid data', () => {
    expect(validateAppointment(valid).isValid).toBe(true);
  });

  it('fails when title is missing', () => {
    expect(validateAppointment({ ...valid, title: '' }).isValid).toBe(false);
  });

  it('fails when person is missing', () => {
    expect(validateAppointment({ ...valid, person: '' }).isValid).toBe(false);
  });

  it('fails when date is missing', () => {
    expect(validateAppointment({ ...valid, date: '' }).isValid).toBe(false);
  });

  it('fails when time is missing', () => {
    expect(validateAppointment({ ...valid, time: '' }).isValid).toBe(false);
  });

  it('fails when location exceeds 100 characters', () => {
    const result = validateAppointment({ ...valid, location: 'X'.repeat(101) });
    expect(result.isValid).toBe(false);
    expect(result.errors.location).toBeDefined();
  });

  it('passes when location is within limits', () => {
    expect(validateAppointment({ ...valid, location: 'Room 5' }).isValid).toBe(true);
  });
});

describe('validateTask', () => {
  const valid = { task: 'Buy groceries', person: 'member-1', priority: 'high' };

  it('passes with valid data', () => {
    expect(validateTask(valid).isValid).toBe(true);
  });

  it('fails when task is missing', () => {
    expect(validateTask({ ...valid, task: '' }).isValid).toBe(false);
  });

  it('fails when task exceeds 200 characters', () => {
    expect(validateTask({ ...valid, task: 'X'.repeat(201) }).isValid).toBe(false);
  });

  it('fails when person is missing', () => {
    expect(validateTask({ ...valid, person: '' }).isValid).toBe(false);
  });

  it('fails when priority is missing', () => {
    expect(validateTask({ ...valid, priority: '' }).isValid).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('strips angle brackets', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('truncates to 500 characters', () => {
    expect(sanitizeInput('A'.repeat(600)).length).toBe(500);
  });

  it('returns non-string input unchanged', () => {
    expect(sanitizeInput(42)).toBe(42);
    expect(sanitizeInput(null)).toBe(null);
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('a.b@c.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@no-user.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('accepts valid phone numbers', () => {
    expect(validatePhone('(555) 123-4567')).toBe(true);
    expect(validatePhone('5551234567')).toBe(true);
  });

  it('rejects numbers with fewer than 10 digits', () => {
    expect(validatePhone('555-1234')).toBe(false);
  });

  it('rejects letters', () => {
    expect(validatePhone('555-abc-1234')).toBe(false);
  });
});
