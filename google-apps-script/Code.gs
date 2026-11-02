// Deploy this script from the onboarding Google Sheet as a Web app.
// Script Properties: SHEET_WRITE_SECRET = a long random value also set in Vercel.
const SHEET_ID = '1FesJ9Phs07BGwtwLA0GF_j-14XRx8urJ7mqBfg5zjyA';
const HEADERS = ['Sales Team Member', 'Customer Name', 'Company Name', 'Sign Up Date', 'Product'];
const ID_HEADER = 'Record ID';

function respond_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, 5).getDisplayValues()[0];
  if (HEADERS.some((header, index) => headers[index] !== header)) throw new Error('Google Sheet column headers changed.');
  return sheet;
}

function ensureIds_(sheet) {
  const header = String(sheet.getRange(1, 6).getValue() || '').trim();
  if (header && header !== ID_HEADER) throw new Error('Column F is already in use.');
  if (!header) sheet.getRange(1, 6).setValue(ID_HEADER);
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 1, last - 1, 6).getValues();
  let changed = false;
  const seen = new Set();
  const ids = rows.map(row => {
    if (!row.slice(0, 5).some(value => String(value).trim())) return [row[5]];
    const id = String(row[5] || '').trim();
    if (/^[0-9a-f-]{36}$/i.test(id) && !seen.has(id)) {
      seen.add(id);
      return [id];
    }
    changed = true;
    const replacement = Utilities.getUuid();
    seen.add(replacement);
    return [replacement];
  });
  if (changed) sheet.getRange(2, 6, ids.length, 1).setValues(ids);
}

function dateString_(value, display, timeZone, locale) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const shown = String(display || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(shown)) return shown;
  const match = shown.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) {
    const us = /^en_US$/i.test(locale);
    const month = Number(us ? match[1] : match[2]);
    const day = Number(us ? match[2] : match[1]);
    const date = new Date(Date.UTC(Number(match[3]), month - 1, day));
    if (date.getUTCMonth() + 1 === month && date.getUTCDate() === day) return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  }
  return shown || text;
}

function list_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    ensureIds_(sheet);
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const timeZone = sheet.getParent().getSpreadsheetTimeZone();
    const locale = sheet.getParent().getSpreadsheetLocale();
    const range = sheet.getRange(2, 1, last - 1, 6);
    const values = range.getValues();
    const displayed = range.getDisplayValues();
    return values
      .map((row, index) => ({ row, shown: displayed[index] }))
      .filter(item => item.row.slice(0, 5).some(value => String(value).trim()))
      .map(({ row, shown }) => ({ id: String(row[5]), salesTeamMember: String(row[0]).trim(), customerName: String(row[1]), companyName: String(row[2]), signUpDate: dateString_(row[3], shown[3], timeZone, locale), product: String(row[4]) }));
  } finally { lock.releaseLock(); }
}

function rowForId_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) throw new Error('Customer record not found.');
  const ids = sheet.getRange(2, 6, last - 1, 1).getValues();
  const index = ids.findIndex(row => String(row[0]) === id);
  if (index < 0) throw new Error('Customer record not found. Refresh the page.');
  return index + 2;
}

function customerValues_(customer) {
  const [year, month, day] = customer.signUpDate.split('-').map(Number);
  return [customer.salesTeamMember, customer.customerName.trim(), customer.companyName.trim(), new Date(year, month - 1, day), customer.product];
}

function validate_(customer) {
  if (!customer || !['Akshay', 'Rohit', 'Michael', 'Anupam', 'Ankit', 'Tripti'].includes(customer.salesTeamMember)) throw new Error('Invalid sales team member.');
  for (const field of ['customerName', 'companyName']) {
    if (typeof customer[field] !== 'string' || !customer[field].trim() || /^[=+\-@]/.test(customer[field].trim())) throw new Error('Invalid customer or company name.');
  }
  if (!/^2026-(10|11|12)-\d{2}$/.test(customer.signUpDate)) throw new Error('Date of onboarding must be in Q4 2026.');
  const [year, month, day] = customer.signUpDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) throw new Error('Invalid date of onboarding.');
  if (customer.product !== 'Clover') throw new Error('Invalid product.');
}

function doPost(e) {
  try {
    const input = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SHEET_WRITE_SECRET');
    if (!secret || input.secret !== secret) throw new Error('Unauthorized.');
    if (input.action === 'list') return respond_({ ok: true, rows: list_() });
    if (!['append', 'update', 'delete'].includes(input.action)) throw new Error('Unknown action.');
    if (input.action !== 'delete') validate_(input.customer);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = sheet_();
      ensureIds_(sheet);
      const row = input.action === 'append' ? sheet.getLastRow() + 1 : rowForId_(sheet, String(input.id || ''));
      if (input.action === 'delete') {
        sheet.deleteRow(row);
        return respond_({ ok: true });
      }
      sheet.getRange(row, 1, 1, 3).setNumberFormat('@');
      sheet.getRange(row, 5).setNumberFormat('@');
      sheet.getRange(row, 1, 1, 5).setValues([customerValues_(input.customer)]);
      sheet.getRange(row, 4).setNumberFormat('yyyy-mm-dd');
      if (input.action === 'append') {
        const id = Utilities.getUuid();
        sheet.getRange(row, 6).setValue(id);
        return respond_({ ok: true, id });
      }
    } finally { lock.releaseLock(); }
    return respond_({ ok: true });
  } catch (error) {
    return respond_({ ok: false, error: error.message || 'Google Sheet request failed.' });
  }
}

