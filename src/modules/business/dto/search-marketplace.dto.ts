import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMarketplaceDto {
  @ApiProperty({
    example: 'iPhone',
    description: 'Search query for products/services/business name',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    example: 6.5244,
    description: 'User latitude for location-based search',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({
    example: 3.3792,
    description: 'User longitude for location-based search',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiProperty({
    example: 10,
    description: 'Search radius in kilometers',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radius?: number = 10;

  @ApiProperty({
    example: 1,
    description: 'Page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 5,
    description: 'Results per page',
    required: false,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
