const members = ['Akshay', 'Rohit', 'Michael', 'Anupam', 'Ankit', 'Tripti'];
const $ = (id) => document.getElementById(id);
let lastData = null;
let lastFingerprint = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function standingCard(person, isLeader, topCount) {
  const item = document.createElement('li');
  item.className = `standing${isLeader ? ' standing-first' : ''}`;

  const identity = document.createElement('div');
  identity.className = 'standing-identity';
  const avatar = document.createElement('span');
  avatar.className = 'standing-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = person.name.slice(0, 1);
  const copy = document.createElement('div');
  copy.className = 'standing-copy';
  const status = document.createElement('span');
  status.className = 'standing-status';
  status.textContent = person.count === 0 ? 'Ready to start' : isLeader ? 'Leading the field' : 'In the race';
  const name = document.createElement('strong');
  name.className = 'standing-name';
  name.textContent = person.name;
  copy.append(status, name);
  identity.append(avatar, copy);

  const pace = document.createElement('div');
  pace.className = 'standing-pace';
  const caption = document.createElement('span');
  caption.className = 'pace-caption';
  caption.textContent = 'Relative team pace';
  const track = document.createElement('div');
  track.className = 'pace-track';
  track.setAttribute('role', 'img');
  track.setAttribute('aria-label', `${person.name} visual pace compared with the team leader; exact figures are on the numbers page`);
  const fill = document.createElement('span');
  fill.className = 'pace-fill';
  track.append(fill);
  pace.append(caption, track);
  item.append(identity, pace);
  const width = `${topCount > 0 ? Math.min(100, (person.count / topCount) * 100) : 0}%`;
  if (reducedMotion.matches) fill.style.width = width;
  else requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = width; }));
  return item;
}

function render(data) {
  const counts = Object.fromEntries(members.map((name) => [name, 0]));
  for (const customer of data.customers || []) {
    const member = String(customer.salesTeamMember || '').trim();
    if (Object.hasOwn(counts, member)) counts[member] += 1;
  }
  const standings = members
    .map((name) => ({ name, count: counts[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const fingerprint = JSON.stringify(standings);
  if (fingerprint !== lastFingerprint) {
    $('standings').replaceChildren(...standings.map((person) => standingCard(person, standings[0].count > 0 && person.count === standings[0].count, standings[0].count)));
    lastFingerprint = fingerprint;
  }
  $('boardStatus').textContent = `Sheet checked ${new Date(data.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  $('heroStatus').textContent = 'Live standings';
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
    $('heroStatus').textContent = 'Source unavailable';
  }
}

refresh();
setInterval(refresh, 60_000);
