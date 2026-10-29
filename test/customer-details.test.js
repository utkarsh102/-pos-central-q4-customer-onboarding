const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  return {
    textContent: '', hidden: false, className: '', children: [], listeners: {},
    querySelector: () => ({ textContent: '' }),
    addEventListener(name, handler) { this.listeners[name] = handler; },
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); },
    scrollIntoView() {}, focus() {}
  };
}

test('count clicks show all submitted records while month clicks show Q4 records', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(html, /data-detail-member="Tripti"/);
  assert.match(html, /data-detail-month="October"/);
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const elements = new Map(ids.map((id) => [id, element()]));
  const triggers = [
    { ...element(), dataset: { detailMember: 'Tripti' } },
    { ...element(), dataset: { detailMember: 'all' } },
    { ...element(), dataset: { detailMember: 'Tripti', detailMonth: 'October' } }
  ];
  const customers = [
    { salesTeamMember: 'Tripti', customerName: 'October customer', companyName: 'Company A', signUpDate: '2026-10-29', product: 'Clover', q4Month: 'October' },
    { salesTeamMember: 'Tripti', customerName: 'January customer', companyName: 'Company B', signUpDate: '2027-01-02', product: 'Clover', q4Month: null },
    { salesTeamMember: 'Akshay', customerName: 'November customer', companyName: 'Company C', signUpDate: '2026-11-02', product: 'Clover', q4Month: 'November' }
  ];
  const names = ['Akshay', 'Rohit', 'Michael', 'Anupam', 'Ankit', 'Tripti'];
  const data = {
    total: 2,
    counts: Object.fromEntries(names.map((name) => [name, name === 'Tripti' || name === 'Akshay' ? 1 : 0])),
    months: ['October', 'November', 'December'].map((name) => ({ name, ...Object.fromEntries(names.map((member) => [member, name === 'October' && member === 'Tripti' || name === 'November' && member === 'Akshay' ? 1 : 0])), total: name === 'December' ? 0 : 1 })),
    customers,
    updatedAt: '2026-10-29T00:00:00.000Z',
    writeReady: true
  };
  vm.runInNewContext(app, {
    document: {
      getElementById: (id) => elements.get(id) || null,
      querySelectorAll: () => triggers,
      createElement: () => element()
    },
    fetch: async () => ({ ok: true, json: async () => data }),
    setInterval: () => {}, console
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(elements.get('triptiCount').textContent, 1);
  triggers[0].listeners.click();
  assert.equal(elements.get('detailsCount').textContent, '2 records');
  assert.equal(elements.get('detailsBody').children[0].children[1].textContent, 'January customer');
  triggers[1].listeners.click();
  assert.equal(elements.get('detailsCount').textContent, '3 records');
  triggers[2].listeners.click();
  assert.equal(elements.get('detailsCount').textContent, '1 record');
  assert.equal(elements.get('detailsBody').children[0].children[1].textContent, 'October customer');
});
