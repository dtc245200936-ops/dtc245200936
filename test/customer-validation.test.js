const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCustomer } = require('../src/customer-validation');

const validCustomer = {
  name: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '0901234567',
  company: 'Example Co',
  status: 'lead',
  notes: '',
};

test('accepts a valid customer record', () => {
  assert.equal(validateCustomer(validCustomer), null);
});

test('rejects invalid email and unsupported status', () => {
  assert.notEqual(validateCustomer({ ...validCustomer, email: 'not-an-email' }), null);
  assert.notEqual(validateCustomer({ ...validCustomer, status: 'admin' }), null);
});

test('rejects missing values and fields beyond configured limits', () => {
  assert.notEqual(validateCustomer({ ...validCustomer, name: ' ' }), null);
  assert.notEqual(validateCustomer({ ...validCustomer, notes: 'x'.repeat(2001) }), null);
  assert.notEqual(validateCustomer({ ...validCustomer, phone: null }), null);
});
