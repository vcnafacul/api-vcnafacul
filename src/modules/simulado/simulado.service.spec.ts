import { Test, TestingModule } from '@nestjs/testing';
import { SimuladoService } from './simulado.service';

describe('SimuladoService', () => {
  let service: SimuladoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimuladoService],
    }).compile();

    service = module.get<SimuladoService>(SimuladoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
