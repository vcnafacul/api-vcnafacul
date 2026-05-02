import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleOauthUser1746200000000 implements MigrationInterface {
  name = 'GoogleOauthUser1746200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`password\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`phone\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`gender\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`birthday\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`state\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`city\` varchar(255) NULL`,
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
      `ALTER TABLE \`users\` DROP INDEX \`IDX_users_google_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`profile_complete\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`google_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`city\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`state\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`birthday\` datetime NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`gender\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`phone\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`password\` varchar(255) NOT NULL`,
    );
  }
}
