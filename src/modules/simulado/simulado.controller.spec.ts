import { Test, TestingModule } from '@nestjs/testing';
import { SimuladoController } from './simulado.controller';

describe('SimuladoController', () => {
  let controller: SimuladoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimuladoController],
    }).compile();

    controller = module.get<SimuladoController>(SimuladoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
