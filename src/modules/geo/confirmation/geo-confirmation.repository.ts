import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { Status } from '../../simulado/enum/status.enum';
import { GeoConfirmation } from './geo-confirmation.entity';

/** Válida = feita depois da última edição de conteúdo do cursinho. */
export const CONDICAO_VALIDA =
  "c.confirmado_em > COALESCE(g.info_updated_at, '1970-01-01')";

@Injectable()
export class GeoConfirmationRepository {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  /**
   * ⚠️ **Upsert atômico** pelo índice único (geo, usuário). Confirmar duas
   * vezes não duplica; reconfirmar depois de uma edição renova o
   * `confirmado_em` e a confirmação volta a valer.
   */
  async confirmar(geoId: string, userId: string, agora: Date): Promise<void> {
    await this.em
      .createQueryBuilder()
      .insert()
      .into(GeoConfirmation)
      .values({ id: randomUUID(), geoId, userId, confirmadoEm: agora })
      .orUpdate(['confirmado_em'], ['geo_id', 'user_id'])
      .execute();
  }

  async desfazer(geoId: string, userId: string): Promise<void> {
    await this.em
      .createQueryBuilder()
      .delete()
      .from(GeoConfirmation)
      .where('geo_id = :geoId AND user_id = :userId', { geoId, userId })
      .execute();
  }

  /** Ids dos cursinhos (aprovados) que o usuário confirmou e ainda valem. */
  async validasDoUsuario(userId: string): Promise<string[]> {
    const linhas: { geo_id: string }[] = await this.em.query(
      `SELECT c.geo_id FROM geo_confirmations c
         INNER JOIN geolocations g ON g.id = c.geo_id
        WHERE c.user_id = ? AND g.status = ? AND g.deleted_at IS NULL
          AND ${CONDICAO_VALIDA}`,
      [userId, Status.Approved],
    );
    return linhas.map((l) => l.geo_id);
  }
}
