import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlteraNewsExpired1772847755431 implements MigrationInterface {
  name = 'AlteraNewsExpired1772847755431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` DROP FOREIGN KEY \`FK_collaborator_frentes_collaborator\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_collaborator_frente\` ON \`collaborator_frentes\``,
    );
    await queryRunner.query(`ALTER TABLE \`news\` ADD \`expire_at\` date NULL`);
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` CHANGE \`updated_at\` \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` DROP COLUMN \`collaborator_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` ADD \`collaborator_id\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_c12587a2f47ea8c93485d241f4\` ON \`collaborator_frentes\` (\`collaborator_id\`, \`frente_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_c12587a2f47ea8c93485d241f4\` ON \`collaborator_frentes\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` DROP COLUMN \`collaborator_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` ADD \`collaborator_id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` CHANGE \`updated_at\` \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`expire_at\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_collaborator_frente\` ON \`collaborator_frentes\` (\`collaborator_id\`, \`frente_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborator_frentes\` ADD CONSTRAINT \`FK_collaborator_frentes_collaborator\` FOREIGN KEY (\`collaborator_id\`) REFERENCES \`collaborators\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
