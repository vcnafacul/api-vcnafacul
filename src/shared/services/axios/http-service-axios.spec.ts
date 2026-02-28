import { HttpException, Logger } from '@nestjs/common';
import { HttpServiceAxios, HttpServiceAxiosFactory } from './http-service-axios.factory';

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => mockAxiosInstance) },
}));

describe('HttpServiceAxios', () => {
  let service: HttpServiceAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HttpServiceAxios('http://localhost:3000', new Logger());
  });

  describe('getFullURL', () => {
    it('should build full URL correctly', () => {
      expect(service.getFullURL('v1/test')).toBe('http://localhost:3000/v1/test');
    });

    it('should remove trailing slash from baseURL', () => {
      const s = new HttpServiceAxios('http://localhost:3000/', new Logger());
      expect(s.getFullURL('v1/test')).toBe('http://localhost:3000/v1/test');
    });

    it('should remove leading slash from path', () => {
      expect(service.getFullURL('/v1/test')).toBe('http://localhost:3000/v1/test');
    });
  });

  describe('getBaseURL', () => {
    it('should return the baseURL', () => {
      expect(service.getBaseURL()).toBe('http://localhost:3000');
    });
  });

  describe('get', () => {
    it('should call axios get and return data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1 } });

      const result = await service.get('v1/items');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('http://localhost:3000/v1/items');
      expect(result).toEqual({ id: 1 });
    });

    it('should handle error with response data', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { data: { message: 'Not Found', status: 404 }, status: 404 },
      });

      await expect(service.get('v1/missing')).rejects.toThrow(HttpException);
      await expect(service.get('v1/missing')).rejects.toMatchObject({
        response: { message: 'Not Found', status: 404 },
      });
    });

    it('should throw fallback error when no response data', async () => {
      mockAxiosInstance.get.mockRejectedValue({ code: 'ECONNREFUSED' });

      await expect(service.get('v1/items')).rejects.toThrow(HttpException);
      await expect(service.get('v1/items')).rejects.toMatchObject({
        response: {
          message: 'Erro desconhecido ou serviço indisponível.',
          status: 'ECONNREFUSED',
        },
      });
    });
  });

  describe('post', () => {
    it('should call axios post with body and return data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 2 } });

      const result = await service.post('v1/items', { name: 'test' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items',
        { name: 'test' },
      );
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('patch', () => {
    it('should call axios patch with body and return data', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: { updated: true } });

      const result = await service.patch('v1/items/1', { name: 'updated' });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
        { name: 'updated' },
      );
      expect(result).toEqual({ updated: true });
    });
  });

  describe('delete', () => {
    it('should call axios delete and return data', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      const result = await service.delete('v1/items/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
      );
      expect(result).toBeNull();
    });
  });

  describe('put', () => {
    it('should call axios put with body and return data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: { replaced: true } });

      const result = await service.put('v1/items/1', { name: 'new' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        'http://localhost:3000/v1/items/1',
        { name: 'new' },
      );
      expect(result).toEqual({ replaced: true });
    });
  });
});

describe('HttpServiceAxiosFactory', () => {
  it('should create an HttpServiceAxios instance', () => {
    const factory = new HttpServiceAxiosFactory({} as any);
    const instance = factory.create('http://localhost:3000');
    expect(instance).toBeInstanceOf(HttpServiceAxios);
    expect(instance.getBaseURL()).toBe('http://localhost:3000');
  });
});
