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
  $('akshayCount').textContent = data.counts.Akshay;
  $('rohitCount').textContent = data.counts.Rohit;
  $('akshayCardCount').textContent = data.counts.Akshay;
  $('rohitCardCount').textContent = data.counts.Rohit;
  for (const member of ['Akshay', 'Rohit']) {
    const share = data.total ? Math.round(data.counts[member] / data.total * 100) : 0;
    $(member.toLowerCase() + 'Share').textContent = data.total ? `${share}% of Q4 onboardings` : 'Ready for the first customer';
    $(member.toLowerCase() + 'Track').style.width = `${share}%`;
  }
  const max = Math.max(1, ...data.months.flatMap((month) => [month.Akshay, month.Rohit]));
  $('chartGrid').replaceChildren(...data.months.map((month) => {
    const section = document.createElement('section');
    section.className = 'chart-month';
    const heading = document.createElement('h3');
    heading.textContent = month.name;
    const bars = document.createElement('div');
    bars.className = 'chart-bars';
    for (const member of ['Akshay', 'Rohit']) {
      const wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      const bar = document.createElement('div');
      bar.className = `bar ${member.toLowerCase()}`;
      const height = month[member] ? Math.max(5, month[member] / max * 88) : 0;
      bar.style.height = `${height}%`;
      wrap.style.setProperty('--bar-height', `${height}%`);
      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = month[member];
      wrap.append(bar, value);
      bars.append(wrap);
    }
    const axis = document.createElement('div');
    axis.className = 'chart-axis';
    axis.innerHTML = '<span>AKSHAY</span><span>ROHIT</span>';
    section.append(heading, bars, axis);
    return section;
  }));
  $('monthCards').replaceChildren(...data.months.map((month) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    const label = document.createElement('span');
    label.textContent = month.name.toUpperCase();
    const count = document.createElement('strong');
    count.textContent = month.total;
    const detail = document.createElement('small');
    detail.textContent = `${month.Akshay} Akshay · ${month.Rohit} Rohit`;
    card.append(label, count, detail);
    return card;
  }));
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
