import { MigrationInterface, QueryRunner } from 'typeorm';

export class Essay1774108744325 implements MigrationInterface {
  name = 'Essay1774108744325';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`essay_themes\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`title\` varchar(200) NOT NULL, \`motivational_text\` text NOT NULL, \`instruction\` text NULL, \`week_start\` date NOT NULL, \`week_end\` date NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_by\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`essay_ai_reviews\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`essay_id\` varchar(255) NOT NULL, \`comp1_score\` int NOT NULL, \`comp1_feedback\` text NOT NULL, \`comp1_suggestion\` text NOT NULL, \`comp2_score\` int NOT NULL, \`comp2_feedback\` text NOT NULL, \`comp2_suggestion\` text NOT NULL, \`comp3_score\` int NOT NULL, \`comp3_feedback\` text NOT NULL, \`comp3_suggestion\` text NOT NULL, \`comp4_score\` int NOT NULL, \`comp4_feedback\` text NOT NULL, \`comp4_suggestion\` text NOT NULL, \`comp5_score\` int NOT NULL, \`comp5_feedback\` text NOT NULL, \`comp5_suggestion\` text NOT NULL, \`total_score\` int NOT NULL, \`general_comment\` text NOT NULL, \`highlighted_excerpts\` json NULL, \`raw_response\` json NULL, \`processing_time_ms\` int NULL, \`provider\` varchar(50) NOT NULL, \`model\` varchar(100) NOT NULL, UNIQUE INDEX \`REL_6f08a1d0b1265a2f94bda2813b\` (\`essay_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`essays\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`theme_id\` varchar(255) NOT NULL, \`title\` varchar(200) NULL, \`text\` text NULL, \`input_type\` enum ('TYPED', 'UPLOADED') NOT NULL DEFAULT 'TYPED', \`status\` enum ('DRAFT', 'SUBMITTED', 'AI_REVIEWED', 'AI_FAILED') NOT NULL DEFAULT 'DRAFT', \`word_count\` int NULL, \`submitted_at\` timestamp NULL, UNIQUE INDEX \`IDX_ffbc03f7b5a0cfd4926dd3b44d\` (\`user_id\`, \`theme_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` ADD \`gerenciar_temas\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_themes\` ADD CONSTRAINT \`FK_c5ab3f09fd10939477bb61f5304\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_ai_reviews\` ADD CONSTRAINT \`FK_6f08a1d0b1265a2f94bda2813ba\` FOREIGN KEY (\`essay_id\`) REFERENCES \`essays\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` ADD CONSTRAINT \`FK_329beda26f1d0bdbf02c37a686d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` ADD CONSTRAINT \`FK_ea19e7960b82bd4acfc584dac79\` FOREIGN KEY (\`theme_id\`) REFERENCES \`essay_themes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`essays\` DROP FOREIGN KEY \`FK_ea19e7960b82bd4acfc584dac79\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`essays\` DROP FOREIGN KEY \`FK_329beda26f1d0bdbf02c37a686d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_ai_reviews\` DROP FOREIGN KEY \`FK_6f08a1d0b1265a2f94bda2813ba\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`essay_themes\` DROP FOREIGN KEY \`FK_c5ab3f09fd10939477bb61f5304\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles\` DROP COLUMN \`gerenciar_temas\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ffbc03f7b5a0cfd4926dd3b44d\` ON \`essays\``,
    );
    await queryRunner.query(`DROP TABLE \`essays\``);
    await queryRunner.query(
      `DROP INDEX \`REL_6f08a1d0b1265a2f94bda2813b\` ON \`essay_ai_reviews\``,
    );
    await queryRunner.query(`DROP TABLE \`essay_ai_reviews\``);
    await queryRunner.query(`DROP TABLE \`essay_themes\``);
  }
}
