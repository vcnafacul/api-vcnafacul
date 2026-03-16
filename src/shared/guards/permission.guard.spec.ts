import { PermissionsGuard } from './permission.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: any;
  let mockUserService: any;
  let mockEnvService: any;

  beforeEach(() => {
    mockReflector = { get: jest.fn() };
    mockUserService = { checkUserPermission: jest.fn() };
    mockEnvService = { get: jest.fn().mockReturnValue('test-secret') };
    guard = new PermissionsGuard(mockReflector, mockUserService, mockEnvService);
  });

  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(guard.snakeToCamel('create_user')).toBe('createUser');
      expect(guard.snakeToCamel('get_all_users')).toBe('getAllUsers');
    });

    it('should handle single word', () => {
      expect(guard.snakeToCamel('admin')).toBe('admin');
    });
  });

  describe('canActivate', () => {
    const createMockContext = (authHeader?: string) => ({
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
        }),
      }),
    });

    it('should return true when no permissions required', async () => {
      mockReflector.get.mockReturnValue(null);
      const context = createMockContext() as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true when empty permissions array', async () => {
      mockReflector.get.mockReturnValue([]);
      const context = createMockContext() as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return false when no authorization header', async () => {
      mockReflector.get.mockReturnValue(['some_permission']);
      const context = createMockContext(undefined) as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should return false when authorization header does not start with Bearer', async () => {
      mockReflector.get.mockReturnValue(['some_permission']);
      const context = createMockContext('Basic token') as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(false);
    });

    it('should return false for invalid token', async () => {
      mockReflector.get.mockReturnValue(['some_permission']);
      const context = createMockContext('Bearer invalid-token') as any;

      const result = await guard.canActivate(context);
      expect(result).toBe(false);
    });
  });
});
