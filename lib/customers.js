const MEMBERS = ['Akshay', 'Rohit'];
const MONTHS = ['October', 'November', 'December'];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function validateCustomer(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Complete all five fields.');
  const salesTeamMember = String(input.salesTeamMember || '').trim();
  const customerName = String(input.customerName || '').trim().replace(/\s+/g, ' ');
  const companyName = String(input.companyName || '').trim().replace(/\s+/g, ' ');
  const signUpDate = String(input.signUpDate || '').trim();
  const product = String(input.product || '').trim();
  if (!MEMBERS.includes(salesTeamMember)) throw new Error('Select Akshay or Rohit.');
  if (!customerName || customerName.length > 100 || /^[=+\-@]/.test(customerName)) throw new Error('Enter a valid customer name (up to 100 characters).');
  if (!companyName || companyName.length > 120 || /^[=+\-@]/.test(companyName)) throw new Error('Enter a valid company name (up to 120 characters).');
  if (!validDate(signUpDate)) throw new Error('Enter a valid Sign Up Date.');
  if (product !== 'Clover') throw new Error('Select Clover as the product.');
  return { salesTeamMember, customerName, companyName, signUpDate, product };
}

function isQ4Date(value) {
  return validDate(value) && value >= '2026-10-01' && value <= '2026-12-31';
}

function summarize(rows) {
  const counts = { Akshay: 0, Rohit: 0 };
  const months = MONTHS.map((name) => ({ name, Akshay: 0, Rohit: 0, total: 0 }));
  for (const row of rows) {
    const member = String(row.salesTeamMember || '').trim();
    const date = String(row.signUpDate || '').trim();
    if (!MEMBERS.includes(member) || !isQ4Date(date)) continue;
    const month = Number(date.slice(5, 7)) - 10;
    counts[member] += 1;
    months[month][member] += 1;
    months[month].total += 1;
  }
  return { total: counts.Akshay + counts.Rohit, counts, months };
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Google Sheet returned invalid CSV.');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const expected = ['Sales Team Member', 'Customer Name', 'Company Name', 'Sign Up Date', 'Product'];
  const header = rows.shift()?.map((value) => value.replace(/^\uFEFF/, '').trim());
  if (!header || expected.some((name, index) => header[index] !== name)) throw new Error('Google Sheet column headers changed.');
  return rows.filter((cells) => cells.some((value) => value.trim())).map((cells) => ({
    salesTeamMember: cells[0] || '', customerName: cells[1] || '', companyName: cells[2] || '', signUpDate: cells[3] || '', product: cells[4] || ''
  }));
}

module.exports = { MEMBERS, MONTHS, validDate, validateCustomer, isQ4Date, summarize, parseCsv };
