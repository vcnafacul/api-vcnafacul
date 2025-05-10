import { MigrationInterface, QueryRunner } from 'typeorm';

export class FileContent1745362450055 implements MigrationInterface {
  name = 'FileContent1745362450055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`content\` CHANGE \`filename\` \`fileId\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE \`file_content\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`fileKey\` varchar(255) NOT NULL, \`originalName\` varchar(255) NULL, \`contentId\` varchar(36) NULL, \`uploadedById\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(`ALTER TABLE \`content\` DROP COLUMN \`fileId\``);
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD \`fileId\` varchar(36) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` ADD CONSTRAINT \`FK_7b0f246d7f95725990ae43c8d02\` FOREIGN KEY (\`contentId\`) REFERENCES \`content\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` ADD CONSTRAINT \`FK_d35b1a40d8a2a7ae522278222b9\` FOREIGN KEY (\`uploadedById\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_45d6eebf9c5f83fd2a4d9a0fabe\` FOREIGN KEY (\`fileId\`) REFERENCES \`file_content\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_45d6eebf9c5f83fd2a4d9a0fabe\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` DROP FOREIGN KEY \`FK_d35b1a40d8a2a7ae522278222b9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` DROP FOREIGN KEY \`FK_7b0f246d7f95725990ae43c8d02\``,
    );
    await queryRunner.query(`ALTER TABLE \`content\` DROP COLUMN \`fileId\``);
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD \`fileId\` varchar(255) NULL`,
    );
    await queryRunner.query(`DROP TABLE \`file_content\``);
    await queryRunner.query(
      `ALTER TABLE \`content\` CHANGE \`fileId\` \`filename\` varchar(255) NULL`,
    );
  }
}
