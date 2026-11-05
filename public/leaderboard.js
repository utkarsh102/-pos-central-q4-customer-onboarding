const members = ['Akshay', 'Rohit', 'Michael', 'Anupam', 'Ankit', 'Tripti'];
const $ = (id) => document.getElementById(id);
let lastData = null;

function render(data) {
  const counts = Object.fromEntries(members.map((name) => [name, 0]));
  for (const customer of data.customers || []) {
    const member = String(customer.salesTeamMember || '').trim();
    if (Object.hasOwn(counts, member)) counts[member] += 1;
  }
  const standings = members
    .map((name) => ({ name, count: counts[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const list = $('standings');
  list.replaceChildren();
  standings.forEach((person) => {
    const rank = standings.findIndex((entry) => entry.count === person.count) + 1;
    const item = document.createElement('li');
    item.className = `standing ${rank === 1 && person.count > 0 ? 'standing-first' : ''}`;
    const position = document.createElement('span');
    position.className = 'standing-rank';
    position.textContent = String(rank).padStart(2, '0');
    const name = document.createElement('strong');
    name.className = 'standing-name';
    name.textContent = person.name;
    item.append(position, name);
    list.append(item);
  });
  $('boardStatus').textContent = `Sheet checked ${new Date(data.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  $('loadError').hidden = true;
}

async function refresh() {
  try {
    const response = await fetch('/api/customers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load customers.');
    lastData = data;
    render(data);
  } catch (error) {
    $('loadError').textContent = lastData ? `Could not refresh standings. Showing the last loaded order. ${error.message}` : `Could not load standings. ${error.message}`;
    $('loadError').hidden = false;
    $('boardStatus').textContent = 'Source unavailable';
  }
}

refresh();
setInterval(refresh, 60_000);
