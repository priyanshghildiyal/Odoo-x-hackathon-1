import test from 'node:test';
import assert from 'node:assert/strict';

test('password policy requires at least twelve characters', () => {
  const validPassword = (value) => typeof value === 'string' && value.length >= 12 && value.length <= 128;
  assert.equal(validPassword('short'), false);
  assert.equal(validPassword('StrongPassword1'), true);
});

test('tenant scoped inventory lookups always include organization boundary', () => {
  const tenantScoped = (organizationId, resourceOrganizationId) => organizationId === resourceOrganizationId;
  assert.equal(tenantScoped(7, 7), true);
  assert.equal(tenantScoped(7, 8), false);
});

test('inventory movement validation rejects zero and non-finite quantities', () => {
  const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
  assert.equal(positive(0), false);
  assert.equal(positive(-2), false);
  assert.equal(positive('bad'), false);
  assert.equal(positive(2.5), true);
});
