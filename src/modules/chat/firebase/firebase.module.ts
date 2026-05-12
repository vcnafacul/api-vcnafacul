import { Global, Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  imports: [EnvModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
