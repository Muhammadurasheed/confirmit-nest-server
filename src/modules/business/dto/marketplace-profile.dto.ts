import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  IsNumber,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessHoursDto {
  @ApiProperty({ example: '09:00', required: false })
  @IsOptional()
  @IsString()
  open?: string;

  @ApiProperty({ example: '18:00', required: false })
  @IsOptional()
  @IsString()
  close?: string;
}

export class LocationDto {
  @ApiProperty({ example: '123 Main St, Lagos' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Ikeja' })
  @IsString()
  area: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  state: string;

  @ApiProperty({ example: { lat: 6.5244, lng: 3.3792 } })
  @IsObject()
  coordinates: {
    lat: number;
    lng: number;
  };
}

export class ContactMethodsDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'contact@business.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'https://www.business.com' })
  @IsUrl()
  website: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ example: '@businessname', required: false })
  @IsOptional()
  @IsString()
  instagram?: string;
}

export class PhotosDto {
  @ApiProperty({ example: 'https://cloudinary.com/primary.jpg' })
  @IsUrl()
  primary: string;

  @ApiProperty({ example: ['https://cloudinary.com/img1.jpg', 'https://cloudinary.com/img2.jpg'] })
  @IsArray()
  @IsUrl({}, { each: true })
  gallery: string[];
}

export class UpdateMarketplaceProfileDto {
  @ApiProperty({ example: 'Your trusted electronics partner', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tagline?: string;

  @ApiProperty({ example: 'We specialize in authentic Apple products...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: ['iPhone', 'MacBook', 'iPad'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  products?: string[];

  @ApiProperty({ example: ['Repair', 'Trade-in', 'Warranty'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhotosDto)
  photos?: PhotosDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  hours?: {
    monday?: BusinessHoursDto | null;
    tuesday?: BusinessHoursDto | null;
    wednesday?: BusinessHoursDto | null;
    thursday?: BusinessHoursDto | null;
    friday?: BusinessHoursDto | null;
    saturday?: BusinessHoursDto | null;
    sunday?: BusinessHoursDto | null;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactMethodsDto)
  contact?: ContactMethodsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
