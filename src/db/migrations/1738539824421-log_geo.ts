import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogGeo1738539824421 implements MigrationInterface {
  name = 'LogGeo1738539824421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`log_geo\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`geo_id\` varchar(255) NOT NULL, \`user_id\` varchar(255) NULL, \`status\` varchar(255) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_geo\` ADD CONSTRAINT \`FK_174345dbad55ad224b04ef99a40\` FOREIGN KEY (\`geo_id\`) REFERENCES \`geolocations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_geo\` ADD CONSTRAINT \`FK_836d5c5c18c30b3f994268154a9\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`log_geo\` DROP FOREIGN KEY \`FK_836d5c5c18c30b3f994268154a9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`log_geo\` DROP FOREIGN KEY \`FK_174345dbad55ad224b04ef99a40\``,
    );
    await queryRunner.query(`DROP TABLE \`log_geo\``);
  }
}
