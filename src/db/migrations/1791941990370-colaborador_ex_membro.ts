import { MigrationInterface, QueryRunner } from 'typeorm';

export class ColaboradorExMembro1791941990370 implements MigrationInterface {
  name = 'ColaboradorExMembro1791941990370';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ⚠️ A FK de user_id usava o UNIQUE como índice: sai e volta (o MySQL
    // cria um índice comum para ela).
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_8235bb5945c983c272fe5d14a24\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8235bb5945c983c272fe5d14a2\` ON \`collaborators\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_8235bb5945c983c272fe5d14a24\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD \`active_user_id\` varchar(36) AS (IF(\`deleted_at\` IS NULL, \`user_id\`, NULL)) STORED`,
    );
    await queryRunner.query(
      `INSERT INTO \`typeorm_metadata\`(\`database\`, \`schema\`, \`table\`, \`type\`, \`name\`, \`value\`) VALUES (DEFAULT, ?, ?, ?, ?, ?)`,
      [
        await queryRunner.getCurrentDatabase(),
        'collaborators',
        'GENERATED_COLUMN',
        'active_user_id',
        'IF(`deleted_at` IS NULL, `user_id`, NULL)',
      ],
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD \`excluded_by_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD \`role_given_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_collaborator_nao_excluido_por_usuario\` ON \`collaborators\` (\`active_user_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_4801aa5cf3dcb826b9aaf83add3\` FOREIGN KEY (\`excluded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_5395187a3d03e1293ba1ee0d2e9\` FOREIGN KEY (\`role_given_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ⚠️ O UNIQUE (user_id) só volta sem ex-membro que tenha colaborador
    // novo. Checa antes de qualquer DDL: no MySQL cada DDL já commita, e falhar
    // no meio deixaria a tabela pela metade.
    const duplicados = await queryRunner.query(
      `SELECT user_id FROM \`collaborators\` GROUP BY user_id HAVING COUNT(*) > 1 LIMIT 1`,
    );
    if (duplicados.length > 0) {
      throw new Error(
        'Há usuário com mais de um colaborador (ex-membro que voltou): apague as linhas excluídas antes de reverter.',
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_5395187a3d03e1293ba1ee0d2e9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_4801aa5cf3dcb826b9aaf83add3\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_collaborator_nao_excluido_por_usuario\` ON \`collaborators\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP COLUMN \`role_given_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP COLUMN \`excluded_by_id\``,
    );
    await queryRunner.query(
      `DELETE FROM \`typeorm_metadata\` WHERE \`type\` = ? AND \`name\` = ? AND \`schema\` = ? AND \`table\` = ?`,
      [
        'GENERATED_COLUMN',
        'active_user_id',
        await queryRunner.getCurrentDatabase(),
        'collaborators',
      ],
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP COLUMN \`active_user_id\``,
    );
    // ⚠️ Só desce sem ex-membro com colaborador novo (o UNIQUE volta).
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_8235bb5945c983c272fe5d14a24\``,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_8235bb5945c983c272fe5d14a2\` ON \`collaborators\` (\`user_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_8235bb5945c983c272fe5d14a24\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
