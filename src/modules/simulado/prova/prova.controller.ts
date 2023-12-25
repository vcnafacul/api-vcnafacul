import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProvaService } from './prova.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateProvaDTOInput } from '../dtos/prova-create.dto.input';
import { Permissions } from 'src/modules/role/role.entity';

@ApiTags('Simulado - Prova')
@Controller('mssimulado/prova')
export class ProvaController {
  constructor(private readonly provaService: ProvaService) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca prova por id',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  public async getProvasAll() {
    return await this.provaService.getProvasAll();
  }

  @Get('missing/:id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca prova por id',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  public async getMissingNumbers(@Param('id') id: string) {
    return await this.provaService.getMissingNumbers(id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca prova por id',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  public async getProvaById(@Param('id') id: string) {
    return await this.provaService.getProvaById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'cadastrar provas',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvas)
  @UseInterceptors(FileInterceptor('file'))
  public async createProvas(
    @Body() dto: CreateProvaDTOInput,
    @UploadedFile() file,
  ) {
    return await this.provaService.createProva(dto, file);
  }
}
