import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleSocialLogin1778250000000 implements MigrationInterface {
  name = 'GoogleSocialLogin1778250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`password\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`phone\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`gender\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`birthday\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`state\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`city\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`google_id\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_users_google_id\` (\`google_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`profile_complete\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`profile_complete\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP INDEX \`IDX_users_google_id\``,
    );
    // Remover usuários criados via Google antes de restaurar NOT NULL,
    // pois esses registros possuem colunas obrigatórias nulas.
    await queryRunner.query(
      `DELETE FROM \`users\` WHERE \`google_id\` IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`google_id\``,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`city\` = '' WHERE \`city\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`city\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`state\` = '' WHERE \`state\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`state\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`birthday\` = '1970-01-01' WHERE \`birthday\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`birthday\` datetime NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`gender\` = 0 WHERE \`gender\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`gender\` int NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`phone\` = '' WHERE \`phone\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`phone\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`users\` SET \`password\` = '' WHERE \`password\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`password\` varchar(255) NOT NULL`,
    );
  }
}
