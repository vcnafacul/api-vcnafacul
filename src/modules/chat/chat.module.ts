import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [FirebaseModule, UserModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
