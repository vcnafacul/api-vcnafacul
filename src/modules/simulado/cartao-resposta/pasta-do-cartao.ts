import type { CartaoQr } from './qr-decoder';

/**
 * O id que nomeia a pasta da foto (`cartoes/<id>/…`) — é por ele que o ms-omr acha o template
 * (`templates/<id>/`): o do simulado no cartão do simulado, o da prova no cartão da prova.
 */
export function idDaPastaDoCartao(
  qr: Pick<CartaoQr, 'provaId' | 'simuladoId'>,
): string {
  return (qr.simuladoId ?? qr.provaId)!;
}
