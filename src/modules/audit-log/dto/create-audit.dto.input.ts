import { IsString } from 'class-validator';

export class CreateAuditDtoInput {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  changes: object;

  @IsString()
  updatedBy: string;
}
