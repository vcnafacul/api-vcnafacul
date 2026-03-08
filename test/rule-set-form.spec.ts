import { RuleSetFormService } from '../src/modules/vcnafacul-form/rule-set/rule-set-form.service';

describe('RuleSetFormService', () => {
  let service: RuleSetFormService;
  let mockAxios: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const mockHttpFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    service = new RuleSetFormService(mockHttpFactory as any, mockEnv as any);
  });

  describe('getRuleSets', () => {
    it('deve chamar GET v1/rules-set', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });
      await service.getRuleSets({} as any);
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rules-set');
    });
  });

  describe('getRuleSetById', () => {
    it('deve chamar GET v1/rules-set/:id', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });
      await service.getRuleSetById('rs-123');
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rules-set/rs-123');
    });
  });

  describe('createRuleSet', () => {
    it('deve chamar POST v1/rules-set', async () => {
      const dto = { name: 'Test RuleSet', inscriptionId: 'insc-1' };
      mockAxios.post.mockResolvedValue({ data: dto });
      await service.createRuleSet(dto);
      expect(mockAxios.post).toHaveBeenCalledWith('v1/rules-set', dto);
    });
  });

  describe('updateRuleSet', () => {
    it('deve chamar PATCH v1/rules-set/:id', async () => {
      const dto = { name: 'Updated' };
      mockAxios.patch.mockResolvedValue({ data: dto });
      await service.updateRuleSet('rs-123', dto);
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/rules-set/rs-123', dto);
    });
  });

  describe('deleteRuleSet', () => {
    it('deve chamar DELETE v1/rules-set/:id', async () => {
      mockAxios.delete.mockResolvedValue({});
      await service.deleteRuleSet('rs-123');
      expect(mockAxios.delete).toHaveBeenCalledWith('v1/rules-set/rs-123');
    });
  });

  describe('addRule', () => {
    it('deve chamar PATCH v1/rules-set/add', async () => {
      const dto = { ruleSetId: 'rs-1', ruleId: 'r-1' };
      mockAxios.patch.mockResolvedValue({ data: {} });
      await service.addRule(dto);
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/rules-set/add', dto);
    });
  });

  describe('removeRule', () => {
    it('deve chamar PATCH v1/rules-set/remove', async () => {
      const dto = { ruleSetId: 'rs-1', ruleId: 'r-1' };
      mockAxios.patch.mockResolvedValue({ data: {} });
      await service.removeRule(dto);
      expect(mockAxios.patch).toHaveBeenCalledWith('v1/rules-set/remove', dto);
    });
  });

  describe('ranking', () => {
    it('deve chamar POST v1/rules-set/ranking', async () => {
      const dto = { ruleSetId: 'rs-1', users: ['u1', 'u2'] };
      mockAxios.post.mockResolvedValue({ data: { rankings: [] } });
      await service.ranking(dto);
      expect(mockAxios.post).toHaveBeenCalledWith('v1/rules-set/ranking', dto);
    });
  });

  describe('getLastRanking', () => {
    it('deve chamar GET v1/rules-set/:id/last-ranking', async () => {
      mockAxios.get.mockResolvedValue({ data: { rankings: [] } });
      await service.getLastRanking('rs-123');
      expect(mockAxios.get).toHaveBeenCalledWith('v1/rules-set/rs-123/last-ranking');
    });
  });
});
