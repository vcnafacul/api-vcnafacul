import 'dotenv/config';
import * as admin from 'firebase-admin';

/**
 * tickets/031, card 02 — grava `partnerPrepId: null` nas conversas que não
 * têm o campo (as iniciadas pelo suporte antes do card 02).
 *
 * ⚠️ Por quê: a conversa aberta agora é buscada POR DESTINO, com
 * `where('partnerPrepId', '==', null)` para o projeto — e no Firestore essa
 * busca NÃO encontra documento sem o campo. Sem o backfill, a conversa antiga
 * do projeto some da busca e o estudante ganha uma segunda.
 *
 * Idempotente: só toca documento sem o campo. Rodar uma vez por ambiente,
 * DEPOIS do deploy da api do card 02 (antes também funciona).
 *
 * Uso:
 *   node --require ts-node/register scripts/backfill-chat-partner-prep-id.ts           # dry-run (só conta)
 *   node --require ts-node/register scripts/backfill-chat-partner-prep-id.ts --apply   # grava
 *
 * Config lida de .env ou variáveis de ambiente (as mesmas da api):
 *   FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_BASE64
 */

const LOTE = 400; // abaixo do limite de 500 escritas por batch

async function main() {
  const aplicar = process.argv.includes('--apply');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const saB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!projectId || !saB64) {
    throw new Error(
      'FIREBASE_PROJECT_ID e FIREBASE_SERVICE_ACCOUNT_BASE64 são obrigatórios',
    );
  }
  const sa = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId });
  const db = admin.firestore();

  // Sem o campo não dá para filtrar no servidor: lê tudo e separa aqui. A
  // coleção é pequena (mensagens expiram em 7 dias; conversas, no máximo
  // algumas milhares).
  const snap = await db.collection('conversations').get();
  const semCampo = snap.docs.filter((d) => !('partnerPrepId' in d.data()));
  const abertas = semCampo.filter((d) => d.data().status === 'open').length;

  console.log(`projeto: ${projectId}`);
  console.log(`conversas: ${snap.size}`);
  console.log(`sem partnerPrepId: ${semCampo.length} (abertas: ${abertas})`);

  if (!aplicar) {
    console.log('dry-run: nada gravado. Rode com --apply para gravar.');
    return;
  }

  for (let i = 0; i < semCampo.length; i += LOTE) {
    const batch = db.batch();
    for (const doc of semCampo.slice(i, i + LOTE)) {
      batch.update(doc.ref, { partnerPrepId: null });
    }
    await batch.commit();
  }

  const depois = (await db.collection('conversations').get()).docs.filter(
    (d) => !('partnerPrepId' in d.data()),
  ).length;
  console.log(`gravado. sem partnerPrepId agora: ${depois}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
