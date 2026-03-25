import { api } from './api';

describe('api auth and request behavior', () => {
  const originalFetch = global.fetch;
  const originalStorage = global.localStorage;

  beforeEach(() => {
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalStorage;
    jest.clearAllMocks();
  });

  test('authHeaders returns Bearer token', () => {
    const headers = api.authHeaders('abc');
    expect(headers.Authorization).toBe('Bearer abc');
    expect(headers['Content-Type']).toBe('application/json');
  });

  test('clears tokens on 401 token-expired response', async () => {
    localStorage.setItem('adminToken', 'x');
    localStorage.setItem('adminData', '{"id":1}');
    localStorage.setItem('memberToken', 'y');
    localStorage.setItem('memberData', '{"id":2}');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => JSON.stringify({ detail: 'Token expired' })
    });

    await expect(api.login('u', 'p')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('adminToken')).toBeNull();
    expect(localStorage.getItem('adminData')).toBeNull();
    expect(localStorage.getItem('memberToken')).toBeNull();
    expect(localStorage.getItem('memberData')).toBeNull();
  });
});
