import { MigrationInterface, QueryRunner } from 'typeorm';

export class EssayReviewUnified1774190937959 implements MigrationInterface {
  name = 'EssayReviewUnified1774190937959';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`essay_reviews\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`essay_id\` varchar(255) NOT NULL, \`review_type\` enum ('AI', 'HUMAN') NOT NULL, \`reviewer_id\` varchar(255) NULL, \`comp1_score\` int NOT NULL, \`comp1_feedback\` text NOT NULL, \`comp1_suggestion\` text NOT NULL, \`comp2_score\` int NOT NULL, \`comp2_feedback\` text NOT NULL, \`comp2_suggestion\` text NOT NULL, \`comp3_score\` int NOT NULL, \`comp3_feedback\` text NOT NULL, \`comp3_suggestion\` text NOT NULL, \`comp4_score\` int NOT NULL, \`comp4_feedback\` text NOT NULL, \`comp4_suggestion\` text NOT NULL, \`comp5_score\` int NOT NULL, \`comp5_feedback\` text NOT NULL, \`comp5_suggestion\` text NOT NULL, \`total_score\` int NOT NULL, \`general_comment\` text NOT NULL, \`highlighted_excerpts\` json NULL, \`raw_response\` json NULL, \`processing_time_ms\` int NULL, \`provider\` varchar(50) NULL, \`model\` varchar(100) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`revisar_redacoes\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` CHANGE \`status\` \`status\` enum ('DRAFT', 'SUBMITTED', 'REVIEWED') NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_settings\` CHANGE \`updated_at\` \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_reviews\` ADD CONSTRAINT \`FK_c82305f9a4c09ac52fcf9feb843\` FOREIGN KEY (\`essay_id\`) REFERENCES \`essays\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_reviews\` ADD CONSTRAINT \`FK_b55633d3a4a0904323a720d0864\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`essay_reviews\` DROP FOREIGN KEY \`FK_b55633d3a4a0904323a720d0864\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_reviews\` DROP FOREIGN KEY \`FK_c82305f9a4c09ac52fcf9feb843\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_settings\` CHANGE \`updated_at\` \`updated_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` CHANGE \`status\` \`status\` enum ('DRAFT', 'SUBMITTED', 'AI_REVIEWED', 'AI_FAILED') NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`revisar_redacoes\``,
    );
    await queryRunner.query(`DROP TABLE \`essay_reviews\``);
  }
}
