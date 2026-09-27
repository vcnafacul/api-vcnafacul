import { MigrationInterface, QueryRunner } from "typeorm";

export class PushNotifications1790532435128 implements MigrationInterface {
    name = 'PushNotifications1790532435128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`push_notification\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`title\` varchar(100) NOT NULL, \`body\` varchar(500) NOT NULL, \`url\` varchar(512) NULL, \`audience\` json NOT NULL, \`sent_by_id\` varchar(255) NULL, \`status\` enum ('sending', 'done', 'failed') NOT NULL DEFAULT 'sending', \`target_users\` int NOT NULL DEFAULT '0', \`target_devices\` int NOT NULL DEFAULT '0', \`success_count\` int NOT NULL DEFAULT '0', \`failure_count\` int NOT NULL DEFAULT '0', \`finished_at\` timestamp NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`push_device\` (\`id\` varchar(36) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`deleted_at\` timestamp NULL, \`user_id\` varchar(255) NOT NULL, \`token\` text NOT NULL, \`token_hash\` varchar(64) NOT NULL, \`user_agent\` varchar(512) NULL, \`platform\` enum ('android', 'ios', 'desktop', 'other') NOT NULL DEFAULT 'other', \`standalone\` tinyint NOT NULL DEFAULT 0, \`last_seen_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`IDX_push_device_user\` (\`user_id\`), UNIQUE INDEX \`IDX_25813d214b5f98b9b8203b0e85\` (\`token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`push_notification\` ADD CONSTRAINT \`FK_cd2564cae7c742dec1ae563b262\` FOREIGN KEY (\`sent_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`push_device\` ADD CONSTRAINT \`FK_51acefad5b190a0bdd49f4bb9e6\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`push_device\` DROP FOREIGN KEY \`FK_51acefad5b190a0bdd49f4bb9e6\``);
        await queryRunner.query(`ALTER TABLE \`push_notification\` DROP FOREIGN KEY \`FK_cd2564cae7c742dec1ae563b262\``);
        await queryRunner.query(`DROP INDEX \`IDX_25813d214b5f98b9b8203b0e85\` ON \`push_device\``);
        await queryRunner.query(`DROP INDEX \`IDX_push_device_user\` ON \`push_device\``);
        await queryRunner.query(`DROP TABLE \`push_device\``);
        await queryRunner.query(`DROP TABLE \`push_notification\``);
    }

}
