import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocalizaUniversidade1735228455188 implements MigrationInterface {
  name = 'LocalizaUniversidade1735228455188';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`campus\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`alias\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`type\` int NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` CHANGE \`number\` \`number\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` CHANGE \`number\` \`number\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`type\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`alias\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`campus\``,
    );
  }
}
