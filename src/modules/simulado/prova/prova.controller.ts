import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  SetMetadata,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/modules/role/role.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CreateProvaDTOInput } from './dtos/prova-create.dto.input';
import { ProvaService } from './prova.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

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
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarProvas,
    Permissions.criarQuestao,
    Permissions.validarQuestao,
  ])
  public async getMissingNumbers(@Param('id') id: string) {
    return await this.provaService.getMissingNumbers(id);
  }

  @Get('summary')
  async getSummary() {
    return await this.provaService.getSummary();
  }

  @Post('sync')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: 202,
    description: 'Inicia sincronizacao em background',
  })
  @ApiResponse({
    status: 409,
    description: 'Sincronizacao ja em andamento',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvas)
  public async startSync() {
    return await this.provaService.startSync();
  }

  @Get('sync/report')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Retorna o relatorio da ultima sincronizacao',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  public async getSyncReport() {
    return await this.provaService.getSyncReport();
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gabarito', maxCount: 1 },
    ]),
  )
  public async createProvas(
    @Body() dto: CreateProvaDTOInput,
    @UploadedFile()
    files: { file: Express.Multer.File[]; gabarito?: Express.Multer.File[] },
  ) {
    return await this.provaService.createProva(
      dto,
      files.file[0],
      files.gabarito[0],
    );
  }

  @Get(':id/file')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'busca arquivo de prova',
  })
  public async getFile(@Param('id') id: string) {
    return await this.provaService.getFile(id);
  }

  @Patch(':id/files')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Atualiza arquivos da prova',
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvas)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'gabarito', maxCount: 1 },
    ]),
  )
  public async updateProvaFiles(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      gabarito?: Express.Multer.File[];
    },
  ) {
    return await this.provaService.updateProvaFiles(
      id,
      files?.file?.[0],
      files?.gabarito?.[0],
    );
  }
}
