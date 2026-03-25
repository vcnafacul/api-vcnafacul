import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { PeriodJustification } from './period-justification.entity';
import { PeriodJustificationService } from './period-justification.service';
import { CreatePeriodJustificationDtoInput } from './dtos/create-period-justification.dto.input';
import { GetPeriodJustificationDtoInput } from './dtos/get-period-justification.dto.input';

@ApiTags('PeriodJustification')
@Controller('period-justification')
export class PeriodJustificationController {
  constructor(private readonly service: PeriodJustificationService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 201,
    description: 'criar justificativa de período',
  })
  async create(
    @Body() dto: CreatePeriodJustificationDtoInput,
    @Req() req: Request,
  ): Promise<PeriodJustification> {
    return await this.service.create(dto, (req.user as User).id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 200,
    description: 'buscar justificativas de período',
  })
  async findAll(@Query() query: GetPeriodJustificationDtoInput) {
    return await this.service.findAll(query);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 204,
    description: 'deletar justificativa de período',
  })
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    await this.service.delete(id, (req.user as User).id);
  }
}
