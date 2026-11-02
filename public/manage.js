const $ = (id) => document.getElementById(id);
const loginForm = $('loginForm');
const manageForm = $('manageForm');
let rows = [];
let editingId = null;

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function showLogin(message = '') {
  $('loginPanel').hidden = false;
  $('managerPanel').hidden = true;
  $('logoutButton').hidden = true;
  $('loginMessage').textContent = message;
}

function showManager() {
  $('loginPanel').hidden = true;
  $('managerPanel').hidden = false;
  $('logoutButton').hidden = false;
}

function resetForm() {
  editingId = null;
  manageForm.reset();
  $('formTitle').textContent = 'Add a customer';
  $('saveButton').textContent = 'Add customer';
  $('cancelEdit').hidden = true;
}

function renderRows() {
  const query = $('searchInput').value.trim().toLowerCase();
  const visible = rows.filter((row) => [row.salesTeamMember, row.customerName, row.companyName, row.product, row.signUpDate].some((value) => String(value).toLowerCase().includes(query)));
  $('listMessage').textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}${query ? ' matching' : ''}`;
  const body = $('manageRows');
  body.replaceChildren();
  if (!visible.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = query ? 'No matching entries.' : 'No customer entries yet.';
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const row of visible) {
    const tr = document.createElement('tr');
    for (const value of [row.signUpDate, row.salesTeamMember, row.customerName, row.companyName, row.product]) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    const actions = document.createElement('td');
    actions.className = 'row-actions';
    for (const [label, action] of [['Edit', 'edit'], ['Delete', 'delete']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.action = action;
      button.dataset.id = row.id;
      actions.append(button);
    }
    tr.append(actions);
    body.append(tr);
  }
}

async function loadRows() {
  const data = await request('/api/admin/records');
  rows = data.rows.sort((a, b) => b.signUpDate.localeCompare(a.signUpDate));
  renderRows();
}

async function initialize() {
  try {
    const session = await request('/api/admin/session');
    if (!session.authenticated) return showLogin();
    await loadRows();
    showManager();
  } catch (error) {
    showLogin(error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const button = loginForm.querySelector('button');
  button.disabled = true;
  $('loginMessage').textContent = '';
  try {
    await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password: new FormData(loginForm).get('password') }) });
    loginForm.reset();
    await loadRows();
    showManager();
  } catch (error) {
    $('loginMessage').textContent = error.message;
  } finally { button.disabled = false; }
});

$('logoutButton').addEventListener('click', async () => {
  try { await request('/api/admin/session', { method: 'DELETE' }); }
  finally { rows = []; resetForm(); showLogin(); }
});

manageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!manageForm.reportValidity()) return;
  const customer = Object.fromEntries(new FormData(manageForm));
  const button = $('saveButton');
  button.disabled = true;
  $('formMessage').textContent = 'Saving…';
  try {
    await request('/api/admin/records', {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(editingId ? { id: editingId, customer } : customer)
    });
    resetForm();
    await loadRows();
    $('formMessage').textContent = 'Customer saved to the Google Sheet.';
  } catch (error) {
    $('formMessage').textContent = error.message;
    if (error.status === 401) showLogin('Session expired. Enter the password again.');
  } finally { button.disabled = false; }
});

$('manageRows').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = rows.find((item) => item.id === button.dataset.id);
  if (!row) return;
  if (button.dataset.action === 'edit') {
    editingId = row.id;
    for (const field of ['salesTeamMember', 'customerName', 'companyName', 'signUpDate', 'product']) manageForm.elements[field].value = row[field];
    $('formTitle').textContent = 'Edit customer';
    $('saveButton').textContent = 'Save changes';
    $('cancelEdit').hidden = false;
    manageForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (!window.confirm(`Delete ${row.customerName} at ${row.companyName} from the Google Sheet?`)) return;
  button.disabled = true;
  try {
    await request('/api/admin/records', { method: 'DELETE', body: JSON.stringify({ id: row.id }) });
    if (editingId === row.id) resetForm();
    await loadRows();
    $('formMessage').textContent = 'Customer deleted from the Google Sheet.';
  } catch (error) {
    $('listMessage').textContent = error.message;
    button.disabled = false;
    if (error.status === 401) showLogin('Session expired. Enter the password again.');
  }
});

$('cancelEdit').addEventListener('click', resetForm);
$('searchInput').addEventListener('input', renderRows);
initialize();
