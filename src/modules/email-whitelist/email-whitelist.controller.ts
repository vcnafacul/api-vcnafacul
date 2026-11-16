import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import { CreateEmailWhitelistDtoInput } from './dtos/create-email-whitelist.dto.input';
import { EmailWhitelistService } from './email-whitelist.service';

@ApiTags('EmailWhitelist')
@Controller('email-whitelist')
export class EmailWhitelistController {
  constructor(private readonly service: EmailWhitelistService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @ApiResponse({ status: 200, description: 'E-mails liberados (fora de prod)' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @ApiResponse({ status: 201, description: 'E-mail adicionado' })
  @ApiResponse({ status: 409, description: 'E-mail já está na whitelist' })
  create(@Body() dto: CreateEmailWhitelistDtoInput) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @ApiResponse({ status: 204, description: 'E-mail removido' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
