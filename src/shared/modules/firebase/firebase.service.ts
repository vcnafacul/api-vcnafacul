import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { EnvService } from 'src/shared/modules/env/env.service';

/**
 * App do Firebase Admin compartilhado por chat (auth + firestore) e push
 * (messaging). Saiu de `modules/chat/firebase` quando o push passou a usar o
 * mesmo app.
 */
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
        'Firebase env vars ausentes — chat e push desabilitados neste ambiente',
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
        'Firebase não configurado neste ambiente',
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

  /** Envio de push (FCM HTTP v1). Usado pelo módulo `push`. */
  messaging(): admin.messaging.Messaging {
    return this.ensureInitialized().messaging();
  }

  /** Sem as env do Firebase a api sobe mesmo assim, só sem chat e push. */
  isEnabled(): boolean {
    return !!this.app;
  }
}
