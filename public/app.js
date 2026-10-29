const $ = (id) => document.getElementById(id);
const form = $('customerForm');
const statusPill = $('statusPill');
const formMessage = $('formMessage');

function setStatus(kind, label) {
  statusPill.className = `status-pill ${kind}`;
  statusPill.querySelector('span').textContent = label;
}

function setFormMessage(message, kind = '') {
  formMessage.className = kind;
  formMessage.textContent = message;
}

function render(data) {
  $('totalCount').textContent = data.total;
  const members = ['Akshay', 'Rohit', 'Michael', 'Anupam'];
  for (const member of members) $(member.toLowerCase() + 'Count').textContent = data.counts[member];
  for (const month of data.months) {
    const prefix = month.name.toLowerCase();
    for (const member of members) $(`${prefix}${member}`).textContent = month[member];
    $(`${prefix}Total`).textContent = month.total;
  }
  $('updatedAt').textContent = `Google Sheet checked ${new Date(data.updatedAt).toLocaleString()}`;
  setStatus('ready', 'Sheet connected');
}

async function refresh() {
  try {
    const response = await fetch('/api/customers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load customers.');
    render(data);
    $('loadError').hidden = true;
    if (!data.writeReady) setFormMessage('Dashboard is live. Registration needs the one-time Google Sheet write connection.', 'error');
    else if (formMessage.textContent.includes('write connection')) setFormMessage('Entries are saved to the linked Google Sheet.');
  } catch (error) {
    setStatus('error', 'Connection issue');
    $('loadError').hidden = false;
    $('loadError').textContent = error.message || 'Could not load the Google Sheet.';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const customer = Object.fromEntries(new FormData(form));
  const button = $('submitButton');
  button.disabled = true;
  setFormMessage('Saving customer…');
  try {
    const response = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save customer.');
    form.reset();
    setFormMessage(result.countsInQ4 ? 'Customer saved. Q4 counts updated.' : 'Customer saved. Its Sign Up Date is outside Q4 2026, so it is not included in these counts.', 'success');
    await refresh();
  } catch (error) {
    setFormMessage(error.message || 'Could not save customer.', 'error');
  } finally {
    button.disabled = false;
  }
});

refresh();
setInterval(refresh, 60000);
