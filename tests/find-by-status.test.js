'use strict';
const { api, validPet, randomId, createCleanup } = require('./helpers');

describe('GET /v2/pet/findByStatus - Find pets by status', () => {
  const cleanup = createCleanup();
  afterAll(() => cleanup.run());

  const createPet = async (overrides = {}) => {
    const res = await api.addPet(validPet({ id: randomId(), ...overrides }));
    expect(res.status).toBe(200);
    cleanup.track(res.body.id);
    return res.body;
  };

  test.each(['available', 'pending', 'sold'])(
    'GET-001/002/003 Find pets with status = %s',
    async (status) => {
      if (status === 'available') await createPet({ status }); // precondition
      const res = await api.findByStatus({ status });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((pet) => expect(pet.status).toBe(status));
    }
  );

  test('GET-004 Find pets with multiple statuses', async () => {
    const qs = new URLSearchParams();
    qs.append('status', 'available');
    qs.append('status', 'pending');
    const res = await api.findByStatus(qs);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((pet) => expect(['available', 'pending']).toContain(pet.status));
    // Both statuses should be represented in a correct implementation
    const statuses = new Set(res.body.map((p) => p.status));
    expect(statuses.has('pending')).toBe(true);
  });

  test('GET-005 Response schema is valid', async () => {
    await createPet({ status: 'available' }); // precondition
    const res = await api.findByStatus({ status: 'available' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((pet) => {
      expect(Number.isInteger(pet.id)).toBe(true);
      expect(typeof pet.name).toBe('string');
      expect(Array.isArray(pet.photoUrls)).toBe(true);
      pet.photoUrls.forEach((u) => expect(typeof u).toBe('string'));
      if (pet.category !== undefined) expect(typeof pet.category).toBe('object');
      if (pet.tags !== undefined) {
        expect(Array.isArray(pet.tags)).toBe(true);
        pet.tags.forEach((t) => expect(typeof t).toBe('object'));
      }
      if (pet.status !== undefined) expect(typeof pet.status).toBe('string');
    });
  });

  test('GET-006 Newly created pet appears in results', async () => {
    const created = await createPet({ status: 'available' });
    const res = await api.findByStatus({ status: 'available' });
    expect(res.status).toBe(200);
    const found = res.body.find((p) => p.id === created.id);
    expect(found).toBeDefined();
    expect(found.name).toBe(created.name);
    expect(found.category).toEqual(created.category);
    expect(found.photoUrls).toEqual(created.photoUrls);
    expect(found.tags).toEqual(created.tags);
  });

  test('GET-007 Pet with a different status is not returned', async () => {
    const sold = await createPet({ status: 'sold' });
    const res = await api.findByStatus({ status: 'available' });
    expect(res.status).toBe(200);
    expect(res.body.find((p) => p.id === sold.id)).toBeUndefined();
  });

  test('GET-008 Invalid status value', async () => {
    const res = await api.findByStatus({ status: 'unknown' });
    expect(res.status).toBe(400);
  });

  test('GET-009 Missing status parameter', async () => {
    const res = await api.findByStatus();
    expect(res.status).toBe(400);
  });

  test('GET-010 Empty status value', async () => {
    const res = await api.findByStatus({ status: '' });
    expect(res.status).toBe(400);
  });

  test('GET-011 Status with capital letter', async () => {
    const res = await api.findByStatus({ status: 'Available' });
    expect(res.status).toBe(400);
  });

  test("GET-012 Special characters / SQL injection in status", async () => {
    const res = await api.findByStatus({ status: "' OR '1'='1" });
    expect(res.status).not.toBe(500);
    expect(res.text).not.toMatch(/stack|exception|at \w+\./i);
    if (res.status === 200) {
      expect(res.body).toEqual([]);
    } else {
      expect(res.status).toBe(400);
    }
  });
});
