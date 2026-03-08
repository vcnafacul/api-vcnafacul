import { RuleFormService } from '../src/modules/vcnafacul-form/rule/rule-form.service';

describe('RuleFormService', () => {
  let service: RuleFormService;
  let mockAxios: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const mockHttpFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    service = new RuleFormService(mockHttpFactory as any, mockEnv as any);
  });

  describe('getRules', () => {
    it('deve chamar GET v1/rule', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });
      await service.getRules({} as any);
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rule');
    });

    it('deve passar query params', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });
      await service.getRules({ page: 1, limit: 10 } as any);
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rule?page=1&limit=10');
    });
  });

  describe('getRuleById', () => {
    it('deve chamar GET v1/rule/:id', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });
      await service.getRuleById('rule-123');
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rule/rule-123');
    });
  });

  describe('createRule', () => {
    it('deve chamar POST v1/rule', async () => {
      const dto = { name: 'Test Rule' };
      mockAxios.post.mockResolvedValue({ data: dto });
      await service.createRule(dto);
      expect(mockAxios.post).toHaveBeenCalledWith('v1/rule', dto);
    });
  });

  describe('updateRule', () => {
    it('deve chamar PUT v1/rule/:id', async () => {
      const dto = { name: 'Updated' };
      mockAxios.put.mockResolvedValue({ data: dto });
      await service.updateRule('rule-123', dto);
      expect(mockAxios.put).toHaveBeenCalledWith('v1/rule/rule-123', dto);
    });
  });

  describe('deleteRule', () => {
    it('deve chamar DELETE v1/rule/:id', async () => {
      mockAxios.delete.mockResolvedValue({});
      await service.deleteRule('rule-123');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/rule/rule-123');
    });
  });
});
