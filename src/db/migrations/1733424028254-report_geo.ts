import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportGeo1733424028254 implements MigrationInterface {
  name = 'ReportGeo1733424028254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`reportAddress\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`reportContact\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`reportOther\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` ADD UNIQUE INDEX \`IDX_d4ed5b288a7073a0be910a4473\` (\`cod_enrolled\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_11acfa80f86df2becee8b55a328\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` CHANGE \`updated_by\` \`updated_by\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_11acfa80f86df2becee8b55a328\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_11acfa80f86df2becee8b55a328\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` CHANGE \`updated_by\` \`updated_by\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_11acfa80f86df2becee8b55a328\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`student_course\` DROP INDEX \`IDX_d4ed5b288a7073a0be910a4473\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`reportOther\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`reportContact\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`reportAddress\``,
    );
  }
}
