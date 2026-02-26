import { IsArray, IsString } from 'class-validator';

export class UpdateCollaboratorFrentesDtoInput {
  @IsArray()
  @IsString({ each: true })
  frenteIds: string[];
}
