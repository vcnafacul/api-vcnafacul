import { EnvService } from './env.service';

describe('EnvService', () => {
  let service: EnvService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
    service = new EnvService(mockConfigService);
  });

  it('should delegate to configService.get with infer option', () => {
    mockConfigService.get.mockReturnValue('test-value');

    const result = service.get('APP_KEY' as any);

    expect(result).toBe('test-value');
    expect(mockConfigService.get).toHaveBeenCalledWith('APP_KEY', {
      infer: true,
    });
  });
});
