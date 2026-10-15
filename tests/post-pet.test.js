'use strict';
const { api, validPet, createCleanup } = require('./helpers');

describe('POST /v2/pet - Add a new pet', () => {
  const cleanup = createCleanup();
  afterAll(() => cleanup.run());

  const add = async (body, opts) => {
    const res = await api.addPet(body, opts);
    if (res.body && res.body.id) cleanup.track(res.body.id);
    return res;
  };

  test('POST-001 Add pet with valid body', async () => {
    const body = validPet();
    const res = await add(body);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('John');
    expect(res.body.category.name).toBe('Cat');
    expect(res.body.photoUrls).toEqual(body.photoUrls);
    expect(res.body.tags).toEqual(body.tags);
    expect(res.body.status).toBe('available');
  });

  test('POST-002 Server generates ID when id = 0', async () => {
    const res = await add(validPet({ id: 0 }));
    expect(res.status).toBe(200);
    expect(typeof res.body.id).toBe('number');
    expect(res.body.id).not.toBe(0);
  });

  test('POST-003 Created pet can be retrieved (GET)', async () => {
    const created = await add(validPet());
    expect(created.status).toBe(200);
    const got = await api.getPet(created.body.id);
    expect(got.status).toBe(200);
    for (const key of ['id', 'name', 'category', 'photoUrls', 'tags', 'status']) {
      expect(got.body[key]).toEqual(created.body[key]);
    }
  });

  test('POST-004 Add pet with a specific ID', async () => {
    const res = await add(validPet({ id: 987654321 }));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(987654321);
  });

  test('POST-005 Status with capital letter ("Available")', async () => {
    const res = await add(validPet({ status: 'Available' }));
    expect(res.status).toBe(405);
  });

  test('POST-006 Invalid status value', async () => {
    const res = await add(validPet({ status: 'unknown' }));
    expect(res.status).toBe(405);
  });

  test.each(['available', 'pending', 'sold'])(
    'POST-007 Each valid status value is accepted (%s)',
    async (status) => {
      const res = await add(validPet({ status }));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  );

  test('POST-008 Required field missing: name', async () => {
    const body = validPet();
    delete body.name;
    const res = await add(body);
    expect(res.status).toBe(405);
  });

  test('POST-009 Required field missing: photoUrls', async () => {
    const body = validPet();
    delete body.photoUrls;
    const res = await add(body);
    expect(res.status).toBe(405);
  });

  test('POST-010 Add pet with required fields only', async () => {
    const body = { name: 'John', photoUrls: ['https://www.google.com'] };
    const res = await add(body);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('John');
    expect(res.body.photoUrls).toEqual(body.photoUrls);
    // optional fields absent or empty
    expect(res.body.category).toBeUndefined();
    expect(res.body.status).toBeUndefined();
    expect(res.body.tags === undefined || res.body.tags.length === 0).toBe(true);
  });

  test('POST-011 Wrong data type: id as string', async () => {
    const res = await add(validPet({ id: 'abc' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
    expect(res.body).toHaveProperty('message');
  });

  test('POST-012 Wrong data type: photoUrls as string', async () => {
    const res = await add(validPet({ photoUrls: 'https://www.google.com' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  test('POST-013 Empty photoUrls array', async () => {
    const res = await add(validPet({ photoUrls: [] }));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('John');
    expect(res.body.photoUrls).toEqual([]);
  });

  test('POST-014 Empty name', async () => {
    const res = await add(validPet({ name: '' }));
    expect(res.status).toBe(405);
  });

  test('POST-015 Very long name (100+ characters)', async () => {
    const name = 'A'.repeat(150);
    const res = await add(validPet({ name }));
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      expect(res.body.name).toBe(name);
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty('message');
    }
  });

  test('POST-016 Special characters and Unicode in name', async () => {
    const name = 'Jöhn <script>alert(1)</script>';
    const res = await add(validPet({ name }));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(name);
  });

  test('POST-017 Add pet with multiple tags', async () => {
    const tags = [
      { id: 1, name: 'Friendly' },
      { id: 2, name: 'Indoor' },
      { id: 3, name: 'Vaccinated' },
    ];
    const res = await add(validPet({ tags }));
    expect(res.status).toBe(200);
    expect(res.body.tags).toHaveLength(3);
    expect(res.body.tags).toEqual(tags);
  });

  test('POST-018 Malformed JSON body', async () => {
    const res = await add('{ "id": 0, "name": "John"');
    expect([400, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('message');
  });

  test('POST-019 Empty JSON object body', async () => {
    const res = await add({});
    expect(res.status).toBe(405);
  });

  test('POST-020 Duplicate submission with the same ID', async () => {
    const body = validPet({ id: 987654321 });
    const first = await add(body);
    expect(first.status).toBe(200);
    const second = await add(body);
    // Expected: second submission is rejected with an error message
    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.body).toHaveProperty('message');
  });
});
