import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { EnvService } from 'src/shared/modules/env/env.service';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app?: admin.app.App;

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

    const existing = admin.apps.find((a): a is admin.app.App => a !== null);
    this.app =
      existing ??
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId,
      });
  }

  private ensureInitialized(): admin.app.App {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Chat de suporte indisponível: Firebase não configurado',
      );
    }
    return this.app;
  }

  auth() {
    return this.ensureInitialized().auth();
  }

  firestore() {
    return this.ensureInitialized().firestore();
  }
}
