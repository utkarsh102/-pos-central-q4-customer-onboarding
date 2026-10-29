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
    { salesTeamMember: 'Rohit', signUpDate: '2027-01-01' },
    { salesTeamMember: 'Akshay', signUpDate: '2026-09-30' }
  ];
  const result = summarize(rows);
  assert.equal(result.total, 5);
  assert.deepEqual(result.counts, { Akshay: 2, Rohit: 1, Michael: 1, Anupam: 1 });
  assert.deepEqual(result.months.map((month) => month.total), [2, 1, 2]);
});

test('accepts Michael and Anupam for registration', () => {
  for (const salesTeamMember of ['Michael', 'Anupam']) {
    const customer = validateCustomer({ salesTeamMember, customerName: 'Jane Doe', companyName: 'Example', signUpDate: '2026-11-02', product: 'Clover' });
    assert.equal(customer.salesTeamMember, salesTeamMember);
  }
});

test('accepts out-of-quarter signup dates but excludes them from Q4', () => {
  const customer = validateCustomer({ salesTeamMember: 'Rohit', customerName: 'Jane Doe', companyName: 'Example', signUpDate: '2027-01-02', product: 'Clover' });
  assert.equal(isQ4Date(customer.signUpDate), false);
});

test('rejects invalid dates and spreadsheet formulas', () => {
  const base = { salesTeamMember: 'Akshay', customerName: 'Jane Doe', companyName: 'Example', signUpDate: '2026-10-01', product: 'Clover' };
  assert.throws(() => validateCustomer({ ...base, signUpDate: '2026-02-30' }));
  assert.throws(() => validateCustomer({ ...base, companyName: '=IMPORTXML("x")' }));
});
