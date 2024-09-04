import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('APP')
@Controller('')
export class AppController {
  constructor() {}

  @Get('health')
  async health() {
    return 'OK';
  }
}
