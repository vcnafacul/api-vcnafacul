import { MigrationInterface, QueryRunner } from 'typeorm';

export class FamilyRelation1730309644277 implements MigrationInterface {
  name = 'FamilyRelation1730309644277';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` ADD \`family_relationship\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` CHANGE \`rg\` \`rg\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` CHANGE \`uf\` \`uf\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` CHANGE \`uf\` \`uf\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` CHANGE \`rg\` \`rg\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`legal_guardian\` DROP COLUMN \`family_relationship\``,
    );
  }
}
