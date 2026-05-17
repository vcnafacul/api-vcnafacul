import { MigrationInterface, QueryRunner } from 'typeorm';

export class HomeSupporterDescription1777217821772
  implements MigrationInterface
{
  name = 'HomeSupporterDescription1777217821772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`home_supporter\` ADD \`description\` varchar(280) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`home_supporter\` DROP COLUMN \`description\``,
    );
  }
}
