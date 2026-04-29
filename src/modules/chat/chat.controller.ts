import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { TokenResponseDto } from './dtos/token-response.dto';

@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('firebase/token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getFirebaseToken(@Req() req: Request): Promise<TokenResponseDto> {
    const reqUser = req.user as { id?: string } | undefined;
    const token = await this.chatService.issueTokenForUserId(reqUser?.id);
    return { token };
  }
}
