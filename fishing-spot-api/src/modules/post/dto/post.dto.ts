import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsUUID()
  spotId: string;

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
