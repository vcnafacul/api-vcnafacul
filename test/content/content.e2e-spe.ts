// import { INestApplication } from '@nestjs/common';
// import { Test, TestingModule } from '@nestjs/testing';
// import { AppModule } from 'src/app.module';
// import { RoleSeedService } from 'src/db/seeds/1-role.seed';
// import { RoleUpdateAdminSeedService } from 'src/db/seeds/2-role-update-admin.seed';
// import { createNestAppTest } from 'test/utils/createNestAppTest';

// describe('Content (e2e)', () => {
//   let app: INestApplication;
//   let roleSeedService: RoleSeedService;
//   let roleUpdateAdminSeedService: RoleUpdateAdminSeedService;
//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = createNestAppTest(moduleFixture);
//     roleSeedService = moduleFixture.get<RoleSeedService>(RoleSeedService);
//     roleUpdateAdminSeedService = moduleFixture.get<RoleUpdateAdminSeedService>(
//       RoleUpdateAdminSeedService,
//     );

//     await app.init();
//     await roleSeedService.seed();
//     await roleUpdateAdminSeedService.seed();
//   });

//   afterAll(async () => {
//     await app.close();
//   });
// });
