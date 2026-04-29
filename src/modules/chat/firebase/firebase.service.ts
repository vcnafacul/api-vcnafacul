import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { EnvService } from 'src/shared/modules/env/env.service';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(private readonly env: EnvService) {}

  onModuleInit() {
    const projectId = this.env.get('FIREBASE_PROJECT_ID');
    const saB64 = this.env.get('FIREBASE_SERVICE_ACCOUNT_BASE64');

    if (!projectId || !saB64) {
      this.logger.warn(
        'Firebase env vars ausentes — chat desabilitado neste ambiente',
      );
      return;
    }

    const sa = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));

    this.app =
      admin.apps.length > 0
        ? admin.apps[0]!
        : admin.initializeApp({
            credential: admin.credential.cert(sa),
            projectId,
          });
  }

  auth() {
    return this.app.auth();
  }

  firestore() {
    return this.app.firestore();
  }
}
