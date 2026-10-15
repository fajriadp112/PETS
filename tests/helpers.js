'use strict';

const BASE_URL = (process.env.BASE_URL || 'https://petstore.swagger.io').replace(/\/$/, '');

async function request(method, path, { body, query, headers = {} } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query) {
    const qs = query instanceof URLSearchParams ? query : new URLSearchParams(query);
    url += `?${qs.toString()}`;
  }
  const opts = { method, headers: { Accept: 'application/json', ...headers } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* non-JSON response */ }
  return { status: res.status, body: json, text };
}

const api = {
  addPet: (body, opts = {}) => request('POST', '/v2/pet', { body, ...opts }),
  getPet: (id) => request('GET', `/v2/pet/${id}`),
  deletePet: (id) => request('DELETE', `/v2/pet/${id}`),
  findByStatus: (query) => request('GET', '/v2/pet/findByStatus', { query }),
};

function validPet(overrides = {}) {
  return {
    id: 0,
    category: { id: 1, name: 'Cat' },
    name: 'John',
    photoUrls: ['https://example.com/photo1.jpg'],
    tags: [{ id: 1, name: 'Available' }],
    status: 'available',
    ...overrides,
  };
}

function randomId() {
  return Math.floor(Math.random() * 9e8) + 1e8;
}

function createCleanup() {
  const ids = new Set();
  return {
    track(id) { if (id !== undefined && id !== null) ids.add(id); },
    async run() {
      await Promise.all([...ids].map((id) => api.deletePet(id).catch(() => {})));
      ids.clear();
    },
  };
}

module.exports = { BASE_URL, request, api, validPet, randomId, createCleanup };
