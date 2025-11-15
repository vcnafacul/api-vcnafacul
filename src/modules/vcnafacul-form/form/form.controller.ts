import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FormService } from './form.service';

@ApiTags('Form Você na Facul')
@Controller('form')
export class FormController {
  constructor(private readonly service: FormService) {}

  @Get(':inscriptionId/inscription')
  public async getFormById(@Param('inscriptionId') id: string) {
    return await this.service.getFormFullByInscriptionId(id);
  }
}
