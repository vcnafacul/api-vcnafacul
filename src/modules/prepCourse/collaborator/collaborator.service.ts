import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';
import { Collaborator } from '../collaborator/collaborator.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorVolunteerDtoOutput } from './dtos/collaborator-volunteer.dto.output';
import { GetAllCollaboratorDtoInput } from './dtos/get-all-collaborator.dto.input';
import { CollaboratorDTOOutput } from './dtos/get-all-collaborator.dto.output';

@Injectable()
export class CollaboratorService extends BaseService<Collaborator> {
  private readonly logger = new Logger(CollaboratorService.name);
  constructor(
    private readonly repository: CollaboratorRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private envService: EnvService,
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
    @Inject('BlobService') private readonly blobService: BlobService,
    private readonly cache: CacheService,
  ) {
    super(repository);
  }

  async getCollaborator({
    page,
    limit,
    userId,
  }: GetAllCollaboratorDtoInput): Promise<GetAllOutput<CollaboratorDTOOutput>> {
    const partnerPrepCourse =
      await this.partnerPrepCourseService.getByUserId(userId);
    if (!partnerPrepCourse) {
      throw new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND);
    }
    const data = await this.repository.findAllBy({
      where: { partnerPrepCourse },
      limit: limit,
      page: page,
    });
    if (!data) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }
    const result: CollaboratorDTOOutput[] = data.data.map((c) => ({
      id: c.id,
      photo: c.photo,
      description: c.description,
      actived: c.actived,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: {
        id: c.user.id,
        name: c.user.useSocialName
          ? `${c.user.socialName} ${c.user.lastName}`
          : `${c.user.firstName} ${c.user.lastName}`,
        email: c.user.email,
        phone: c.user.phone,
        role: {
          id: c.user.role.id,
          name: c.user.role.name,
        },
        lastAccess: c.user.lastAccess,
      },
    }));
    return {
      data: result,
      totalItems: data.totalItems,
      page: data.page,
      limit: data.limit,
    };
  }

  async getCollaboratorByPrepPartner(
    id: string,
  ): Promise<CollaboratorVolunteerDtoOutput[]> {
    const collaborator = await this.repository.findOneByPrepPartner(id);
    return collaborator.map((c) => ({
      name: c.user.useSocialName
        ? `${c.user.socialName} ${c.user.lastName}`
        : `${c.user.firstName} ${c.user.lastName}`,
      description: c.description,
      image: c.photo,
      actived: c.actived,
    }));
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const collaborator = await this.repository.findOneByUserId(userId);
    if (collaborator.photo) {
      try {
        await this.blobService.deleteFile(
          collaborator.photo,
          this.envService.get('BUCKET_DOC'),
        );
        await this.cache.del(`collaborator:photo:${collaborator.photo}`);
      } catch (error) {
        this.logger.error(`Error to delete file ${collaborator.photo}`, error);
      }
    }
    const fileName = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_DOC'),
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    collaborator.photo = fileName;
    await this.repository.update(collaborator);
    const buffer = await this.blobService.getFile(
      fileName,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.set(
      `collaborator:photo:${fileName}`,
      buffer,
      60 * 60 * 24 * 1000 * 7,
    );
    return fileName;
  }

  async removeImage(userId: string): Promise<boolean> {
    const collaborator = await this.repository.findOneByUserId(userId);
    await this.blobService.deleteFile(
      collaborator.photo,
      this.envService.get('BUCKET_DOC'),
    );
    await this.cache.del(`collaborator:photo:${collaborator.photo}`);
    collaborator.photo = null;
    await this.repository.update(collaborator);
    return true;
  }

  async changeActive(id: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.actived = !collaborator.actived;
    if (!collaborator.actived) {
      const user = await this.userRepository.findOneBy({
        id: collaborator.user.id,
      });
      const aluno = await this.roleRepository.findOneBy({ name: 'aluno' });
      user.role = aluno;
      await this.userRepository.update(user);
    }
    await this.repository.update(collaborator);
    return collaborator;
  }

  async changeDescription(id: string, description: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.description = description;
    await this.repository.update(collaborator);
    return collaborator;
  }

  async getPhoto(imageKey: string) {
    const cachedFile = await this.cache.wrap<{
      buffer: string;
      contentType: string;
    }>(
      `collaborator:photo:${imageKey}`,
      async () => {
        return await this.blobService.getFile(
          imageKey,
          this.envService.get('BUCKET_DOC'),
        );
      },
      60 * 60 * 24 * 1000 * 7,
    );
    return cachedFile;
  }
}
