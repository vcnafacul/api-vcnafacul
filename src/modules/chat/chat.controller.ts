import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { InitiateConversationDto } from './dtos/initiate-conversation.dto';
import { OpenConversationDto } from './dtos/open-conversation.dto';
import { SendMessageDto } from './dtos/send-message.dto';
import { TokenResponseDto } from './dtos/token-response.dto';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';

type AuthenticatedReqUser = {
  id: string;
  name?: string;
  socialName?: string | null;
};

function getReqUser(req: Request): AuthenticatedReqUser | undefined {
  return req.user as AuthenticatedReqUser | undefined;
}

@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('firebase/token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async getFirebaseToken(@Req() req: Request): Promise<TokenResponseDto> {
    const reqUser = getReqUser(req);
    const token = await this.chatService.issueTokenForUserId(reqUser?.id);
    return { token };
  }

  // Sem ChatRateLimitGuard: cooldown 15min embutido em ChatService já protege
  // contra abuse de open/close em loop.
  @Post('chat/conversation/open')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async openConversation(
    @Req() req: Request,
    @Body() body: OpenConversationDto,
  ): Promise<{ id: string }> {
    const user = getReqUser(req);
    if (!user?.id) throw new ForbiddenException();
    const { actorType, displayName } = await this.chatService.resolveActor(
      user.id,
    );
    if (actorType !== 'student') {
      throw new ForbiddenException('Apenas estudantes abrem conversas');
    }
    return this.chatService.openConversation(
      user.id,
      displayName,
      body.metadata,
    );
  }

  @Post('chat/conversation/:id/close')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async closeConversation(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    const user = getReqUser(req);
    if (!user?.id) throw new ForbiddenException();
    const actorType = await this.chatService.resolveActorType(user.id);
    await this.chatService.closeConversation(id, user.id, actorType);
    return { ok: true };
  }

  @Post('chat/message')
  @UseGuards(AuthGuard('jwt'), ChatRateLimitGuard)
  @ApiBearerAuth()
  async sendMessage(
    @Req() req: Request,
    @Body() body: SendMessageDto,
  ): Promise<{ id: string }> {
    const user = getReqUser(req);
    if (!user?.id) throw new ForbiddenException();
    const { actorType, displayName } = await this.chatService.resolveActor(
      user.id,
    );
    return this.chatService.sendMessage({
      senderId: user.id,
      senderName: displayName,
      senderType: actorType,
      conversationId: body.conversationId,
      content: body.content,
    });
  }

  @Post('chat/conversation/:id/read')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async markRead(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    const user = getReqUser(req);
    if (!user?.id) throw new ForbiddenException();
    const actorType = await this.chatService.resolveActorType(user.id);
    await this.chatService.markRead(id, user.id, actorType);
    return { ok: true };
  }

  @Post('chat/conversations/initiate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async initiateConversation(
    @Req() req: Request,
    @Body() body: InitiateConversationDto,
  ): Promise<{ conversationId: string; messageId: string }> {
    const user = getReqUser(req);
    if (!user?.id) throw new ForbiddenException();
    const { actorType, displayName } = await this.chatService.resolveActor(
      user.id,
    );
    if (actorType !== 'support') {
      throw new ForbiddenException('Apenas suporte pode iniciar conversa');
    }
    return this.chatService.initiateConversation(
      user.id,
      displayName,
      body.targetUserId,
      body.content,
    );
  }
}
