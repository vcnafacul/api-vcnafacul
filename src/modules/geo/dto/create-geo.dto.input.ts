import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TypeGeo } from '../enum/typeGeo';

export class CreateGeoDTOInput {
  @IsNumber()
  @ApiProperty()
  latitude: number;

  @IsNumber()
  @ApiProperty()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  cep: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  state: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  street: string;

  @IsString()
  @ApiProperty()
  number: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  complement: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  phone: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  whatsapp: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  email: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  email2: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  category: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  site: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  linkedin: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  youtube: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  facebook: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  instagram: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  twitter: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  tiktok: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  userFullName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  userPhone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  userConnection: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  userEmail: string;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  reportAddress?: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  reportContact?: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  reportOther?: boolean = false;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  campus?: string;

  @IsEnum(TypeGeo)
  @ApiProperty({ enum: TypeGeo })
  type: TypeGeo;
}
