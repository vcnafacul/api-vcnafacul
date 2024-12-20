import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocalizaUniversidade1734702789744 implements MigrationInterface {
  name = 'LocalizaUniversidade1734702789744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`campus\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` ADD \`type\` int NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`type\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`geolocations\` DROP COLUMN \`campus\``,
    );
  }
}
