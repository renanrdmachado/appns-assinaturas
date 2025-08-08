const axios = require('axios');

jest.mock('axios');

const AsaasApiClient = require('../../helpers/AsaasApiClient');

describe('AsaasApiClient.request', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, AS_URL: 'https://api.asaas.test/v3', AS_TOKEN: 'token-xyz' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('deve realizar requisição com sucesso e retornar response.data', async () => {
    const fakeData = { ok: true };
    axios.mockResolvedValueOnce({ data: fakeData });

    const result = await AsaasApiClient.request({
      method: 'GET',
      endpoint: 'customers/123',
    });

    expect(result).toEqual(fakeData);
    expect(axios).toHaveBeenCalledTimes(1);
    const cfg = axios.mock.calls[0][0];
    expect(cfg).toMatchObject({
      method: 'GET',
      url: 'https://api.asaas.test/v3/customers/123',
    });
    expect(cfg.headers).toMatchObject({
      Accept: 'application/json',
      access_token: 'token-xyz',
    });
    // data deve estar undefined quando não enviado
    expect('data' in cfg).toBe(true);
    expect(cfg.data).toBeUndefined();
  });

  it('deve montar URL com params e mesclar/override headers', async () => {
    axios.mockResolvedValueOnce({ data: { ok: true } });

    const params = new URLSearchParams();
    params.append('limit', '10');
    params.append('offset', '20');

    await AsaasApiClient.request({
      method: 'POST',
      endpoint: 'payments',
      params,
      data: { any: 'thing' },
      headers: { Accept: 'custom/type', 'X-Custom': 'yes' },
    });

    const cfg = axios.mock.calls[0][0];
    expect(cfg.url).toBe('https://api.asaas.test/v3/payments?limit=10&offset=20');
    // Accept deve ser o do header custom (override) mas access_token permanece
    expect(cfg.headers.Accept).toBe('custom/type');
    expect(cfg.headers['X-Custom']).toBe('yes');
    expect(cfg.headers.access_token).toBe('token-xyz');
    expect(cfg.data).toEqual({ any: 'thing' });
  });

  it('deve lançar erro formatado quando Asaas retorna errors padrão (error.response)', async () => {
    const err = new Error('Original message');
    err.response = {
      status: 400,
      data: {
        errors: [
          { description: 'Campo X inválido' },
          { description: 'CPF inválido' },
        ],
      },
    };
    axios.mockRejectedValueOnce(err);

    try {
      await AsaasApiClient.request({ method: 'GET', endpoint: 'customers' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.message).toContain('Campo X inválido, CPF inválido');
      expect(e.status).toBe(400);
      expect(e.asaasError).toBeDefined();
      expect(e.asaasError.status).toBe(400);
      expect(Array.isArray(e.asaasError.errors)).toBe(true);
      expect(e.asaasError.errors).toHaveLength(2);
      expect(e.asaasError.originalError).toBeDefined();
    }
  });

  it('deve usar message de error.response.data quando não há errors padrão', async () => {
    const err = new Error('Generic');
    err.response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      data: { message: 'Falha na validação' },
    };
    axios.mockRejectedValueOnce(err);

    await expect(
      AsaasApiClient.request({ method: 'POST', endpoint: 'subscriptions' })
    ).rejects.toThrow('Falha na validação');
  });

  it('deve usar statusText quando não há message em data', async () => {
    const err = new Error('Another');
    err.response = {
      status: 500,
      statusText: 'Server Error',
      data: {},
    };
    axios.mockRejectedValueOnce(err);

    await expect(
      AsaasApiClient.request({ method: 'GET', endpoint: 'ping' })
    ).rejects.toThrow('Server Error');
  });

  it('deve usar error.message quando não há message em data nem statusText', async () => {
    const err = new Error('Fallback genérico');
    err.response = {
      status: 502,
      statusText: '',
      data: {},
    };
    axios.mockRejectedValueOnce(err);

    await expect(
      AsaasApiClient.request({ method: 'GET', endpoint: 'status' })
    ).rejects.toThrow('Fallback genérico');
  });

  it('deve lançar erro "Sem resposta do servidor Asaas" quando error.request existe', async () => {
    const err = new Error('ECONNABORTED');
    err.request = { timeout: true };
    axios.mockRejectedValueOnce(err);

    await expect(
      AsaasApiClient.request({ method: 'GET', endpoint: 'health' })
    ).rejects.toThrow('Sem resposta do servidor Asaas');
  });

  it('deve propagar erro original quando não há response nem request', async () => {
    const err = new Error('Configuração inválida');
    axios.mockRejectedValueOnce(err);

    await expect(
      AsaasApiClient.request({ method: 'GET', endpoint: 'anything' })
    ).rejects.toThrow('Configuração inválida');
  });
});
