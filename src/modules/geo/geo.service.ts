import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GeoRepository } from './geo.repository';
import { CreateGeoDTOInput } from './dto/create-geo.dto.input';
import { Geolocation } from './geo.entity';
import { UserService } from '../user/user.service';
import { EmailService } from 'src/shared/services/email.service';
import { ListGeoDTOInput } from './dto/list-geo.dto.input';
import { StatusGeolocation } from './enum/status-geolocation';
import { UpdateGeoDTOInput } from './dto/update-geo.dto.input';
import { GeoStatusChangeDTOInput } from './dto/geo-status.dto.input';
import { User } from '../user/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class GeoService {
  constructor(
    private readonly geoRepository: GeoRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(geoDTOInput: CreateGeoDTOInput): Promise<Geolocation> {
    const newGeo = await this.geoRepository.create(
      this.convertDtoToDomain(geoDTOInput),
    );
    const listEmail = await this.userService.getvalidateGeo();
    await this.emailService.sendCreateGeoMail(newGeo, listEmail);

    return newGeo;
  }

  async findAllByFilter(filterDto: ListGeoDTOInput): Promise<Geolocation[]> {
    const where: any = { status: StatusGeolocation.Validated };

    if (filterDto.status) {
      where.status = parseInt(filterDto.status as any) as StatusGeolocation;
    }

    if (filterDto.limit) {
      filterDto.limit = parseInt(filterDto.limit as any);
    }

    if (filterDto.offset) {
      filterDto.offset = parseInt(filterDto.offset as any);
    }

    return await this.geoRepository.findBy(
      where,
      filterDto.limit,
      filterDto.offset,
    );
  }

  async findById(id: number): Promise<Geolocation> {
    const geo = await this.geoRepository.findOneBy({ id: id });

    // Verifica se o registro existe
    if (!geo) {
      throw new HttpException(
        `Geolocation with id ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return geo;
  }

  async updateGeo(updateDTO: UpdateGeoDTOInput, user: User): Promise<boolean> {
    const oldGeo = await this.findById(updateDTO.id);
    const changes = {};
    Object.keys(updateDTO).forEach((key) => {
      if (updateDTO[key] !== undefined && updateDTO[key] !== oldGeo[key]) {
        changes[key] = { old: oldGeo[key], new: updateDTO[key] };
        oldGeo[key] = updateDTO[key];
      }
    });
    if (Object.keys(changes).length === 0) {
      return false;
    }
    await this.geoRepository.update(oldGeo);
    await this.auditLogService.create({
      entityType: 'geolocations',
      entityId: oldGeo.id,
      changes: changes,
      updatedBy: user.id,
    });
    return true;
  }

  async validateGeolocation(geoStatus: GeoStatusChangeDTOInput, user: User) {
    const geo = await this.findById(geoStatus.geoId);
    const oldStatus = geo.status;
    geo.status = geoStatus.status;
    await this.geoRepository.update(geo);

    const changes = { old: { status: oldStatus }, new: { status: geo.status } };
    if (geoStatus.refuseReason) {
      changes['refuseReason'] = geoStatus.refuseReason;
    }

    await this.auditLogService.create({
      entityType: 'geolocations',
      entityId: geo.id,
      changes: changes,
      updatedBy: user.id,
    });
  }

  private convertDtoToDomain(dto: CreateGeoDTOInput): Geolocation {
    const geolocation = new Geolocation();
    geolocation.latitude = dto.latitude;
    geolocation.longitude = dto.longitude;
    geolocation.name = dto.name;
    geolocation.cep = dto.cep;
    geolocation.state = dto.state;
    geolocation.city = dto.city;
    geolocation.neighborhood = dto.neighborhood;
    geolocation.street = dto.street;
    geolocation.number = dto.number;
    geolocation.complement = dto.complement ?? '';
    geolocation.phone = dto.phone ?? '';
    geolocation.whatsapp = dto.whatsapp ?? '';
    geolocation.email = dto.email ?? '';
    geolocation.email2 = dto.email2 ?? '';
    geolocation.category = dto.category ?? '';
    geolocation.site = dto.site ?? '';
    geolocation.linkedin = dto.linkedin ?? '';
    geolocation.youtube = dto.youtube ?? '';
    geolocation.facebook = dto.facebook ?? '';
    geolocation.instagram = dto.instagram ?? '';
    geolocation.twitter = dto.twitter ?? '';
    geolocation.tiktok = dto.tiktok ?? '';
    geolocation.userFullName = dto.userFullName ?? '';
    geolocation.userPhone = dto.userPhone ?? '';
    geolocation.userConnection = dto.userConnection ?? '';
    geolocation.userEmail = dto.userEmail ?? '';
    return geolocation;
  }
}
