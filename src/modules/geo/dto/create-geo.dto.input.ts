import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  whatsapp: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  email2: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  category: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  site: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  linkedin: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  youtube: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  facebook: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  instagram: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  twitter: string;

  @IsString()
  @IsNotEmpty()
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
}
