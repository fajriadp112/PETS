'use strict';
const { api, request, validPet, randomId } = require('./helpers');

describe('DELETE /v2/pet/{id} - Delete a pet', () => {
  // Every test creates its own pet (precondition: "a pet exists and its id is known").
  const createPet = async (overrides = {}) => {
    const res = await api.addPet(validPet({ id: randomId(), ...overrides }));
    expect(res.status).toBe(200);
    return res.body;
  };

  test('DELETE-001 Delete an existing pet', async () => {
    const pet = await createPet();
    const res = await api.deletePet(pet.id);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.type).toBe('unknown');
    expect(res.body.message).toBe(String(pet.id));
  });

  test('DELETE-002 Deleted pet can no longer be retrieved', async () => {
    const pet = await createPet();
    const del = await api.deletePet(pet.id);
    expect(del.status).toBe(200);
    const get = await api.getPet(pet.id);
    expect(get.status).toBe(404);
    expect(get.body.message).toBe('Pet not found');
  });

  test('DELETE-003 Deleted pet is removed from findByStatus results', async () => {
    const pet = await createPet({ status: 'available' });
    const del = await api.deletePet(pet.id);
    expect(del.status).toBe(200);
    const res = await api.findByStatus({ status: 'available' });
    expect(res.status).toBe(200);
    expect(res.body.find((p) => p.id === pet.id)).toBeUndefined();
  });

  test('DELETE-004 Delete the same pet twice', async () => {
    const pet = await createPet();
    const first = await api.deletePet(pet.id);
    expect(first.status).toBe(200);
    const second = await api.deletePet(pet.id);
    expect(second.status).toBe(404);
  });

  test('DELETE-005 Delete a pet that does not exist', async () => {
    const res = await api.deletePet(999999999999);
    expect(res.status).toBe(404);
  });

  test('DELETE-006 Invalid ID: non-numeric', async () => {
    const res = await api.deletePet('abc');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  test('DELETE-007 Invalid ID: negative number', async () => {
    const res = await api.deletePet(-1);
    expect(res.status).toBe(404);
  });

  test('DELETE-008 Boundary ID: 0', async () => {
    const res = await api.deletePet(0);
    expect(res.status).toBe(404);
  });

  test('DELETE-009 ID larger than the maximum integer', async () => {
    const res = await api.deletePet('99999999999999999999'); // string: exceeds JS safe integer
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  test('DELETE-010 Delete without an ID in the path', async () => {
    const res = await request('DELETE', '/v2/pet/');
    expect([404, 405]).toContain(res.status);
  });
});
