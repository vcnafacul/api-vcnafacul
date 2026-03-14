import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController();
  });

  describe('health', () => {
    it('should return OK', async () => {
      const result = await controller.health();
      expect(result).toBe('OK');
    });
  });
});
