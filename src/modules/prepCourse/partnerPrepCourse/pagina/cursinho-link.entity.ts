import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { CursinhoPagina } from './cursinho-pagina.entity';

export enum TipoDeLink {
  Publico = 'publico',
  /** Só colaborador ativo ou aluno matriculado do cursinho (tickets/025, R5). */
  Interno = 'interno',
}

/**
 * ⚠️ Tabela, não coluna `json`: homol e prod são MariaDB, que guarda `json`
 * como `LONGTEXT`, e o TypeORM (driver mysql) gera DDL diferente para os dois.
 */
@Entity('cursinho_link')
export class CursinhoLink extends BaseEntity {
  @Column({ name: 'pagina_id' })
  paginaId: string;

  @ManyToOne(() => CursinhoPagina, (p) => p.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pagina_id' })
  pagina: CursinhoPagina;

  @Column({ type: 'varchar', length: 10 })
  tipo: TipoDeLink;

  @Column({ length: 100 })
  titulo: string;

  @Column({ length: 500 })
  url: string;

  @Column({ type: 'int', default: 0 })
  ordem: number;
}
