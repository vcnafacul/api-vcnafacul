import { MigrationInterface, QueryRunner } from "typeorm";

export class HomeContent1776557019275 implements MigrationInterface {
    name = 'HomeContent1776557019275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`home_supporter\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`logo_url\` varchar(512) NULL, \`link\` varchar(512) NOT NULL, \`order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`home_feature\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`image_url\` varchar(512) NULL, \`order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`home_feature_section\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NULL, \`description\` text NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`home_about\` (\`id\` int NOT NULL AUTO_INCREMENT, \`video_url\` varchar(255) NULL, \`thumbnail_url\` varchar(512) NULL, \`description\` text NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`home_about\``);
        await queryRunner.query(`DROP TABLE \`home_feature_section\``);
        await queryRunner.query(`DROP TABLE \`home_feature\``);
        await queryRunner.query(`DROP TABLE \`home_supporter\``);
    }

}
