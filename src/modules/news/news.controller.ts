import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { Request } from 'express';
import { CreateNewsDtoInput } from './dtos/create-news.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { User } from '../user/user.entity';
import { FileInterceptor } from '@nestjs/platform-express/multer';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newService: NewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async findall() {
    return await this.newService.findAll();
  }

  @Get()
  async find() {
    return await this.newService.findActived();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: number) {
    return await this.newService.delete(id);
  }
}
