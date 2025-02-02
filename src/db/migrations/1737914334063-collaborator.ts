import { MigrationInterface, QueryRunner } from 'typeorm';

export class Collaborator1737914334063 implements MigrationInterface {
  name = 'Collaborator1737914334063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP FOREIGN KEY \`FK_2abeb84841d3be03a58e85dc18a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_2cef8c4e2dc48dcb2db298e5efd\``,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_2abeb84841d3be03a58e85dc18\` ON \`partner_prep_course\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`collaborators\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`photo\` varchar(255) NULL, \`description\` varchar(255) NULL, \`actived\` tinyint NOT NULL DEFAULT 1, \`lastAccess\` datetime NULL, \`user_id\` varchar(36) NULL, \`partner_prep_course_id\` varchar(36) NULL, UNIQUE INDEX \`REL_8235bb5945c983c272fe5d14a2\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` DROP COLUMN \`user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_inscricoes_cursinho_parceiro\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`collaborator\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`collaboratorDescription\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`collaboratorPhoto\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`partner_prep_course_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`base\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_processo_seletivo\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_colaboradores\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_8235bb5945c983c272fe5d14a24\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` ADD CONSTRAINT \`FK_1e3f504a48e53465837420bfacc\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_1e3f504a48e53465837420bfacc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`collaborators\` DROP FOREIGN KEY \`FK_8235bb5945c983c272fe5d14a24\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_colaboradores\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_processo_seletivo\``,
    );
    await queryRunner.query(`ALTER TABLE \`roles\` DROP COLUMN \`base\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`partner_prep_course_id\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`collaboratorPhoto\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`collaboratorDescription\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`collaborator\` tinyint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_inscricoes_cursinho_parceiro\` tinyint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD \`user_id\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8235bb5945c983c272fe5d14a2\` ON \`collaborators\``,
    );
    await queryRunner.query(`DROP TABLE \`collaborators\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_2abeb84841d3be03a58e85dc18\` ON \`partner_prep_course\` (\`user_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_2cef8c4e2dc48dcb2db298e5efd\` FOREIGN KEY (\`partner_prep_course_id\`) REFERENCES \`partner_prep_course\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` ADD CONSTRAINT \`FK_2abeb84841d3be03a58e85dc18a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
