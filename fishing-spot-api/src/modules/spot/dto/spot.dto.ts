import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateSpotDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fishTypes?: string[];
}
