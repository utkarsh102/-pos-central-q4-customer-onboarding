const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('dashboard renders all six people and monthly counts', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const elements = new Map(ids.map((id) => [id, { textContent: '', className: '', hidden: false, querySelector: () => ({ textContent: '' }), addEventListener: () => {} }]));
  const data = {
    total: 13,
    counts: { Akshay: 1, Rohit: 2, Michael: 3, Anupam: 4, Ankit: 1, Tripti: 2 },
    customers: [
      { salesTeamMember: 'Akshay', signUpDate: '2026-10-01' },
      { salesTeamMember: 'Akshay', signUpDate: '2027-01-01' },
      { salesTeamMember: 'Anupam', signUpDate: '2026-11-01' }
    ],
    months: [
      { name: 'October', Akshay: 1, Rohit: 0, Michael: 1, Anupam: 0, Ankit: 1, Tripti: 0, total: 3 },
      { name: 'November', Akshay: 0, Rohit: 2, Michael: 1, Anupam: 1, Ankit: 0, Tripti: 1, total: 5 },
      { name: 'December', Akshay: 0, Rohit: 0, Michael: 1, Anupam: 3, Ankit: 0, Tripti: 1, total: 5 }
    ],
    updatedAt: '2026-10-29T00:00:00.000Z',
    writeReady: true
  };
  vm.runInNewContext(app, {
    document: { getElementById: (id) => elements.get(id) || null, querySelectorAll: () => [] },
    fetch: async () => ({ ok: true, json: async () => data }),
    setInterval: () => {},
    console
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(elements.get('totalCount').textContent, 13);
  assert.equal(elements.get('michaelCount').textContent, 3);
  assert.equal(elements.get('anupamCount').textContent, 4);
  assert.equal(elements.get('ankitCount').textContent, 1);
  assert.equal(elements.get('triptiCount').textContent, 2);
  assert.equal(elements.get('novemberRohit').textContent, 2);
  assert.equal(elements.get('decemberAnupam').textContent, 3);
  assert.equal(elements.get('octoberAnkit').textContent, 1);
  assert.equal(elements.get('decemberTripti').textContent, 1);
  assert.equal(elements.get('leaderTitle').textContent, 'Akshay is leading');
  assert.equal(elements.get('leaderScore').textContent, '2 customers · 1 ahead');
  assert.ok(html.indexOf('id="leaderTitle"') < html.indexOf('id="monthlyTitle"'));
  assert.ok(html.indexOf('id="monthlyTitle"') < html.indexOf('id="registerTitle"'));
});

test('leader indicator handles ties and an empty sheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const elements = new Map(ids.map((id) => [id, { textContent: '', addEventListener: () => {} }]));
  const context = {
    document: { getElementById: (id) => elements.get(id) || null, querySelectorAll: () => [] },
    fetch: () => new Promise(() => {}),
    setInterval: () => {}
  };
  vm.runInNewContext(app + '\nglobalThis.renderLeaderForTest = renderLeader;', context);
  context.renderLeaderForTest([]);
  assert.equal(elements.get('leaderTitle').textContent, 'No leader yet');
  context.renderLeaderForTest([{ salesTeamMember: 'Rohit' }, { salesTeamMember: 'Tripti' }]);
  assert.equal(elements.get('leaderTitle').textContent, 'Rohit and Tripti are tied');
  assert.equal(elements.get('leaderScore').textContent, '1 customer each');
});
