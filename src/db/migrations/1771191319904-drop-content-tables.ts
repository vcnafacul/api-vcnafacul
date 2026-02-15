import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropContentTables1771191319904 implements MigrationInterface {
  name = 'DropContentTables1771191319904';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys on file_content
    await queryRunner.query(
      `ALTER TABLE \`file_content\` DROP FOREIGN KEY \`FK_7b0f246d7f95725990ae43c8d02\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` DROP FOREIGN KEY \`FK_d35b1a40d8a2a7ae522278222b9\``,
    );

    // Drop foreign keys on content
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_45d6eebf9c5f83fd2a4d9a0fabe\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_aca2d12589a8580b96b9d4dd76a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` DROP FOREIGN KEY \`FK_43185da5e33e99752c6edf91352\``,
    );

    // Drop foreign key on subject
    await queryRunner.query(
      `ALTER TABLE \`subject\` DROP FOREIGN KEY \`FK_125d29f48682dabb6c905e84513\``,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE \`file_content\``);
    await queryRunner.query(`DROP TABLE \`content\``);
    await queryRunner.query(`DROP TABLE \`subject\``);
    await queryRunner.query(`DROP TABLE \`frente\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_de416546e101a7076c5f11d13c\` ON \`snapshot_content_status\``,
    );
    await queryRunner.query(`DROP TABLE \`snapshot_content_status\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate frente
    await queryRunner.query(
      `CREATE TABLE \`frente\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`head\` varchar(255) NULL, \`tail\` varchar(255) NULL, \`lenght\` int NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL, \`materia\` int NOT NULL, UNIQUE INDEX \`IDX_b71f980928922d70c48696fe0e\` (\`name\`, \`materia\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Recreate subject
    await queryRunner.query(
      `CREATE TABLE \`subject\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`head\` varchar(255) NULL, \`tail\` varchar(255) NULL, \`lenght\` int NOT NULL DEFAULT '0', \`name\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`frenteId\` varchar(36) NULL, UNIQUE INDEX \`IDX_ade0f940dba920f53e48e486eb\` (\`name\`, \`frenteId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Recreate content
    await queryRunner.query(
      `CREATE TABLE \`content\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`prev\` varchar(255) NULL, \`next\` varchar(255) NULL, \`fileId\` varchar(36) NULL, \`status\` int NOT NULL DEFAULT '3', \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`userId\` varchar(36) NULL, \`subjectId\` varchar(36) NULL, UNIQUE INDEX \`IDX_26bd75273b5769641de10ecc41\` (\`title\`, \`subjectId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Recreate file_content
    await queryRunner.query(
      `CREATE TABLE \`file_content\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`fileKey\` varchar(255) NOT NULL, \`originalName\` varchar(255) NULL, \`contentId\` varchar(36) NULL, \`uploadedById\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Recreate snapshot_content_status
    await queryRunner.query(
      `CREATE TABLE \`snapshot_content_status\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`snapshot_date\` date NOT NULL, \`pendentes\` int NOT NULL DEFAULT '0', \`aprovados\` int NOT NULL DEFAULT '0', \`reprovados\` int NOT NULL DEFAULT '0', \`pendentes_upload\` int NOT NULL DEFAULT '0', \`total\` int NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_de416546e101a7076c5f11d13c\` (\`snapshot_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Recreate foreign keys
    await queryRunner.query(
      `ALTER TABLE \`subject\` ADD CONSTRAINT \`FK_125d29f48682dabb6c905e84513\` FOREIGN KEY (\`frenteId\`) REFERENCES \`frente\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_43185da5e33e99752c6edf91352\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_aca2d12589a8580b96b9d4dd76a\` FOREIGN KEY (\`subjectId\`) REFERENCES \`subject\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`content\` ADD CONSTRAINT \`FK_45d6eebf9c5f83fd2a4d9a0fabe\` FOREIGN KEY (\`fileId\`) REFERENCES \`file_content\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` ADD CONSTRAINT \`FK_7b0f246d7f95725990ae43c8d02\` FOREIGN KEY (\`contentId\`) REFERENCES \`content\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`file_content\` ADD CONSTRAINT \`FK_d35b1a40d8a2a7ae522278222b9\` FOREIGN KEY (\`uploadedById\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
