import { IsString, IsOptional, IsArray, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CandidateSpotDto {
  @IsOptional()
  @IsString()
  sourcePoiId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  source?: string;
}

export class CreatePostDto {
  @IsOptional()
  @IsUUID()
  spotId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CandidateSpotDto)
  candidateSpot?: CandidateSpotDto;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fishCategories?: string[];

  @IsOptional()
  @IsString()
  spotEvaluation?: string;
}
