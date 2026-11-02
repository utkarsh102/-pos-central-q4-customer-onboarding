const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Apps Script uses stable IDs to edit and delete the intended sheet row', () => {
  const values = [
    ['Sales Team Member', 'Customer Name', 'Company Name', 'Sign Up Date', 'Product', ''],
    ['Akshay', 'First', 'One Co', '2026-10-01', 'Clover', ''],
    ['Tripti', 'Second', 'Two Co', '2026-11-01', 'Clover', '']
  ];
  let sequence = 0;
  const sheet = {
    getLastRow: () => values.length,
    getParent: () => ({ getSpreadsheetTimeZone: () => 'UTC' }),
    deleteRow: (row) => values.splice(row - 1, 1),
    getRange(row, column, height = 1, width = 1) {
      return {
        getValue: () => values[row - 1]?.[column - 1],
        getDisplayValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => String(values[row - 1 + i]?.[column - 1 + j] ?? ''))),
        getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => values[row - 1 + i]?.[column - 1 + j] ?? '')),
        setValue(value) { this.setValues([[value]]); },
        setValues(data) {
          for (let i = 0; i < data.length; i += 1) {
            while (values.length < row + i) values.push([]);
            for (let j = 0; j < data[i].length; j += 1) values[row - 1 + i][column - 1 + j] = data[i][j];
          }
        },
        setNumberFormat() {}
      };
    }
  };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-secret' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: { getUuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`, formatDate: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../google-apps-script/Code.gs'), 'utf8'), context);
  const send = (payload) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ secret: 'test-secret', ...payload }) } }).text);
  const listed = send({ action: 'list' });
  assert.equal(listed.ok, true);
  assert.equal(values[0][5], 'Record ID');
  const first = listed.rows[0].id;
  const second = listed.rows[1].id;
  values.splice(1, 2, values[2], values[1]);
  assert.equal(send({ action: 'update', id: first, customer: { salesTeamMember: 'Akshay', customerName: 'Edited', companyName: 'One Co', signUpDate: '2026-12-01', product: 'Clover' } }).ok, true);
  assert.equal(values[2][1], 'Edited');
  assert.equal(send({ action: 'delete', id: second }).ok, true);
  assert.equal(values.length, 2);
  assert.equal(values[1][1], 'Edited');
  assert.equal(send({ action: 'delete', id: second }).ok, false);
});
