const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, summarize, validateCustomer, isQ4Date } = require('../lib/customers');

test('parses Google Sheet headers and quoted customer data', () => {
  const rows = parseCsv('Sales Team Member,Customer Name,Company Name,Sign Up Date,Product\nAkshay,"Doe, Jane",Example Co,2026-10-03,Clover\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].customerName, 'Doe, Jane');
});

test('counts every Q4 submission by person and month', () => {
  const rows = [
    { salesTeamMember: 'Akshay', signUpDate: '2026-10-01' },
    { salesTeamMember: 'Akshay', signUpDate: '2026-10-01' },
    { salesTeamMember: 'Rohit', signUpDate: '2026-12-31' },
    { salesTeamMember: 'Michael', signUpDate: '2026-11-10' },
    { salesTeamMember: 'Anupam', signUpDate: '2026-12-01' },
    { salesTeamMember: 'Ankit', signUpDate: '2026-10-15' },
    { salesTeamMember: 'Tripti', signUpDate: '2026-11-15' },
    { salesTeamMember: 'Rohit', signUpDate: '2027-01-01' },
    { salesTeamMember: 'Akshay', signUpDate: '2026-09-30' }
  ];
  const result = summarize(rows);
  assert.equal(result.total, 7);
  assert.deepEqual(result.counts, { Akshay: 2, Rohit: 1, Michael: 1, Anupam: 1, Ankit: 1, Tripti: 1 });
  assert.deepEqual(result.months.map((month) => month.total), [3, 2, 2]);
});

test('accepts all six team members for registration', () => {
  for (const salesTeamMember of ['Akshay', 'Rohit', 'Michael', 'Anupam', 'Ankit', 'Tripti']) {
    const customer = validateCustomer({ salesTeamMember, customerName: 'Jane Doe', companyName: 'Example', signUpDate: '2026-11-02', product: 'Clover' });
    assert.equal(customer.salesTeamMember, salesTeamMember);
  }
});

test('accepts Q4 boundary dates and rejects dates outside Q4', () => {
  const base = { salesTeamMember: 'Rohit', customerName: 'Jane Doe', companyName: 'Example', product: 'Clover' };
  assert.equal(validateCustomer({ ...base, signUpDate: '2026-10-01' }).signUpDate, '2026-10-01');
  assert.equal(validateCustomer({ ...base, signUpDate: '2026-12-31' }).signUpDate, '2026-12-31');
  for (const signUpDate of ['2026-09-30', '2027-01-01', '2026-11-31']) {
    assert.throws(() => validateCustomer({ ...base, signUpDate }), /October 1 through December 31, 2026/);
  }
});

test('rejects invalid dates and spreadsheet formulas', () => {
  const base = { salesTeamMember: 'Akshay', customerName: 'Jane Doe', companyName: 'Example', signUpDate: '2026-10-01', product: 'Clover' };
  assert.throws(() => validateCustomer({ ...base, signUpDate: '2026-02-30' }));
  assert.throws(() => validateCustomer({ ...base, companyName: '=IMPORTXML("x")' }));
});
