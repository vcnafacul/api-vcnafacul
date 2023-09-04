import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGeoDTOInput {
  @IsNumber()
  @ApiProperty()
  id: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  latitude: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  longitude: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  cep: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  state: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  city: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  street: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  number: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  complement: string;

  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
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
}
