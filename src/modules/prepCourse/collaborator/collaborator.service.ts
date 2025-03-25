import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { removeFileFTP } from 'src/utils/removeFileFtp';
import { uploadFileFTP } from 'src/utils/uploadFileFtp';
import { Collaborator } from '../collaborator/collaborator.entity';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorVolunteerDtoOutput } from './dtos/collaborator-volunteer.dto.output';
import { GetAllCollaboratorDtoInput } from './dtos/get-all-collaborator.dto.input';
import { CollaboratorDTOOutput } from './dtos/get-all-collaborator.dto.output';

@Injectable()
export class CollaboratorService extends BaseService<Collaborator> {
  constructor(
    private readonly repository: CollaboratorRepository,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private configService: ConfigService,
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
      throw new HttpException('Usuário nao encontrado', HttpStatus.NOT_FOUND);
    }
    const result: CollaboratorDTOOutput[] = data.data.map((c) => ({
      id: c.id,
      photo: c.photo,
      description: c.description,
      actived: c.actived,
      lastAccess: c.lastAccess,
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
        await removeFileFTP(
          collaborator.photo,
          this.configService.get<string>('FTP_HOST'),
          this.configService.get<string>('FTP_PROFILE'),
          this.configService.get<string>('FTP_PASSWORD'),
        );
      } catch (error) {
        console.log(error);
      }
    }
    const fileName = await uploadFileFTP(
      file,
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_PROFILE'),
      this.configService.get<string>('FTP_PASSWORD'),
    );
    if (!fileName) {
      throw new HttpException('error to upload file', HttpStatus.BAD_REQUEST);
    }
    collaborator.photo = fileName;
    await this.repository.update(collaborator);
    return fileName;
  }

  async removeImage(userId: string): Promise<boolean> {
    const collaborator = await this.repository.findOneByUserId(userId);
    const deleted = await removeFileFTP(
      collaborator.photo,
      this.configService.get<string>('FTP_HOST'),
      this.configService.get<string>('FTP_PROFILE'),
      this.configService.get<string>('FTP_PASSWORD'),
    );
    if (deleted) {
      collaborator.photo = null;
      await this.repository.update(collaborator);
      return true;
    }
    return false;
  }

  async changeActive(id: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.actived = !collaborator.actived;
    await this.repository.update(collaborator);
    return collaborator;
  }

  async changeDescription(id: string, description: string) {
    const collaborator = await this.repository.findOneBy({ id });
    collaborator.description = description;
    await this.repository.update(collaborator);
    return collaborator;
  }
}
