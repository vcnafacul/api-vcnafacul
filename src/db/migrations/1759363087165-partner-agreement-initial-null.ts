import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartnerAgreementInitialNull1759363087165
  implements MigrationInterface
{
  name = 'PartnerAgreementInitialNull1759363087165';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` CHANGE \`partnershipAgreement\` \`partnershipAgreement\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`partner_prep_course\` CHANGE \`partnershipAgreement\` \`partnershipAgreement\` varchar(255) NOT NULL`,
    );
  }
}
