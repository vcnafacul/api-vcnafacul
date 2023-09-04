import { IsNumber, IsString } from 'class-validator';

export class CreateAuditDtoInput {
  @IsString()
  entityType: string;

  @IsString()
  entityId: number;

  @IsString()
  changes: object;

  @IsNumber()
  updatedBy: number;
}
