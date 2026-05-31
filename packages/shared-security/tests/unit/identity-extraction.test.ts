import { describe, it, expect } from 'vitest';

import { extractIdentityFromHeaders, extractIdentityFromMessageHeaders, injectIdentityHeaders } from '../../src/identity-extraction';

describe('extractIdentityFromHeaders', () => {
  it('should extract userId and role from valid headers', () => {
    const result = extractIdentityFromHeaders({
      'x-forgekit-user-id': 'user-123',
      'x-forgekit-role': 'admin',
    });

    expect(result.userId).toBe('user-123');
    expect(result.role).toBe('admin');
  });

  it('should return undefined for missing headers', () => {
    const result = extractIdentityFromHeaders({});

    expect(result.userId).toBeUndefined();
    expect(result.role).toBeUndefined();
  });

  it('should trim whitespace from values', () => {
    const result = extractIdentityFromHeaders({
      'x-forgekit-user-id': '  user-123  ',
      'x-forgekit-role': '  admin  ',
    });

    expect(result.userId).toBe('user-123');
    expect(result.role).toBe('admin');
  });

  it('should treat empty strings as absent', () => {
    const result = extractIdentityFromHeaders({
      'x-forgekit-user-id': '',
      'x-forgekit-role': '',
    });

    expect(result.userId).toBeUndefined();
    expect(result.role).toBeUndefined();
  });

  it('should treat whitespace-only strings as absent', () => {
    const result = extractIdentityFromHeaders({
      'x-forgekit-user-id': '   ',
      'x-forgekit-role': '   ',
    });

    expect(result.userId).toBeUndefined();
    expect(result.role).toBeUndefined();
  });

  it('should handle array values by using the first element', () => {
    const result = extractIdentityFromHeaders({
      'x-forgekit-user-id': ['user-123', 'user-456'],
      'x-forgekit-role': ['admin', 'viewer'],
    });

    expect(result.userId).toBe('user-123');
    expect(result.role).toBe('admin');
  });
});

describe('extractIdentityFromMessageHeaders', () => {
  it('should extract identity from message headers', () => {
    const result = extractIdentityFromMessageHeaders({
      'x-forgekit-user-id': 'user-123',
      'x-forgekit-role': 'admin',
    });

    expect(result.userId).toBe('user-123');
    expect(result.role).toBe('admin');
  });

  it('should handle Buffer values from AMQP', () => {
    const result = extractIdentityFromMessageHeaders({
      'x-forgekit-user-id': Buffer.from('user-123'),
      'x-forgekit-role': Buffer.from('admin'),
    });

    expect(result.userId).toBe('user-123');
    expect(result.role).toBe('admin');
  });

  it('should return undefined for non-string, non-Buffer values', () => {
    const result = extractIdentityFromMessageHeaders({
      'x-forgekit-user-id': 12345,
      'x-forgekit-role': true,
    });

    expect(result.userId).toBeUndefined();
    expect(result.role).toBeUndefined();
  });
});

describe('injectIdentityHeaders', () => {
  it('should inject present identity values', () => {
    const result = injectIdentityHeaders({ userId: 'user-123', role: 'admin' });

    expect(result).toEqual({
      'x-forgekit-user-id': 'user-123',
      'x-forgekit-role': 'admin',
    });
  });

  it('should omit absent identity values', () => {
    const result = injectIdentityHeaders({ userId: undefined, role: undefined });

    expect(result).toEqual({});
  });

  it('should omit only the absent field', () => {
    const result = injectIdentityHeaders({ userId: 'user-123', role: undefined });

    expect(result).toEqual({ 'x-forgekit-user-id': 'user-123' });
  });
});
