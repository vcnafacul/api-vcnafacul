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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { User } from '../user/user.entity';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newService: NewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'criar divulgação de novidades',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadNews)
  @UseInterceptors(FileInterceptor('file'))
  async createNews(
    @Body() body: CreateNewsDtoInput,
    @Req() req: Request,
    @UploadedFile() file,
  ) {
    return await this.newService.create(body, file, (req.user as User).id);
  }

  @Get('all')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'listar todas as novidades cadastradas',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadNews)
  async findall(@Query() query: GetAllDtoInput) {
    return await this.newService.findAll(query);
  }

  @Get()
  async find() {
    return await this.newService.findActived();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'deletar novidade por id',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.uploadNews)
  async delete(@Param('id') id: number) {
    return await this.newService.delete(id);
  }
}
