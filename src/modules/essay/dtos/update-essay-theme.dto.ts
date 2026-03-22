import { PartialType } from '@nestjs/swagger';
import { CreateEssayThemeDto } from './create-essay-theme.dto';

export class UpdateEssayThemeDto extends PartialType(CreateEssayThemeDto) {}
