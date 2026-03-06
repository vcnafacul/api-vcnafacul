import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { User } from '../user/user.entity';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { GetAllNewsDtoInput } from './dtos/get-all-news';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newService: NewsService) {}

  @Get('file/:fileKey')
  @ApiResponse({
    status: 200,
    description: 'Arquivo da novidade (cache 7 dias)',
  })
  async getFile(
    @Param('fileKey') fileKey: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const key = decodeURIComponent(fileKey);
    const { buffer, contentType } = await this.newService.getFile(key);
    res.set({
      'Content-Type': contentType,
      'Cache-Control': this.newService.getCacheControlHeader(),
    });
    return res.send(Buffer.from(buffer, 'base64'));
  }

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
    @UploadedFile() file: Express.Multer.File,
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
  async findall(@Query() query: GetAllNewsDtoInput) {
    return await this.newService.findAllBy(query);
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
  async delete(@Param('id') id: string) {
    return await this.newService.delete(id);
  }

  @Get('summary')
  async getSummary() {
    return await this.newService.getSummary();
  }
}
