// Deploy this script from the onboarding Google Sheet as a Web app.
// Script Properties: SHEET_WRITE_SECRET = a long random value also set in Vercel.
const SHEET_ID = '1FesJ9Phs07BGwtwLA0GF_j-14XRx8urJ7mqBfg5zjyA';
const HEADERS = ['Sales Team Member', 'Customer Name', 'Company Name', 'Sign Up Date', 'Product'];

function respond_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, 5).getDisplayValues()[0];
  if (HEADERS.some((header, index) => headers[index] !== header)) throw new Error('Google Sheet column headers changed.');
  return sheet;
}

function dateString_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error('An existing Sign Up Date is not a recognized date.');
}

function list_() {
  const sheet = sheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const timeZone = sheet.getParent().getSpreadsheetTimeZone();
  return sheet.getRange(2, 1, last - 1, 5).getValues()
    .filter(row => row.some(value => String(value).trim()))
    .map(row => ({ salesTeamMember: String(row[0]).trim(), customerName: String(row[1]), companyName: String(row[2]), signUpDate: dateString_(row[3], timeZone), product: String(row[4]) }));
}

function validate_(customer) {
  if (!customer || !['Akshay', 'Rohit', 'Michael', 'Anupam'].includes(customer.salesTeamMember)) throw new Error('Invalid sales team member.');
  for (const field of ['customerName', 'companyName']) {
    if (typeof customer[field] !== 'string' || !customer[field].trim() || /^[=+\-@]/.test(customer[field].trim())) throw new Error('Invalid customer or company name.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(customer.signUpDate)) throw new Error('Invalid Sign Up Date.');
  if (customer.product !== 'Clover') throw new Error('Invalid product.');
}

function doPost(e) {
  try {
    const input = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SHEET_WRITE_SECRET');
    if (!secret || input.secret !== secret) throw new Error('Unauthorized.');
    if (input.action === 'list') return respond_({ ok: true, rows: list_() });
    if (input.action !== 'append') throw new Error('Unknown action.');
    validate_(input.customer);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = sheet_();
      const row = sheet.getLastRow() + 1;
      const c = input.customer;
      const [year, month, day] = c.signUpDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      sheet.getRange(row, 1, 1, 3).setNumberFormat('@');
      sheet.getRange(row, 5).setNumberFormat('@');
      sheet.getRange(row, 1, 1, 5).setValues([[c.salesTeamMember, c.customerName.trim(), c.companyName.trim(), date, c.product]]);
      sheet.getRange(row, 4).setNumberFormat('yyyy-mm-dd');
    } finally { lock.releaseLock(); }
    return respond_({ ok: true });
  } catch (error) {
    return respond_({ ok: false, error: error.message || 'Google Sheet request failed.' });
  }
}
