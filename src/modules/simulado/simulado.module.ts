import { Module } from '@nestjs/common';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [SimuladoController],
  providers: [SimuladoService],
})
export class SimuladoModule {}
