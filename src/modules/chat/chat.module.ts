import { Module } from '@nestjs/common';
import { CacheManagerModule } from 'src/shared/modules/cache/cache.module';
import { UserModule } from '../user/user.module';
import { CollaboratorModule } from '../prepCourse/collaborator/collaborator.module';
import { StudentCourseModule } from '../prepCourse/studentCourse/student-course.module';
import { InscriptionCourseModule } from '../prepCourse/InscriptionCourse/inscription-course.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRateLimitGuard } from './guards/chat-rate-limit.guard';

@Module({
  imports: [UserModule, CacheManagerModule, CollaboratorModule, StudentCourseModule, InscriptionCourseModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRateLimitGuard],
})
export class ChatModule {}
