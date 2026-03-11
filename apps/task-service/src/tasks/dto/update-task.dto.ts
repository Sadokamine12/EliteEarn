import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

const taskTypes = ['review', 'rating', 'survey', 'ad'] as const;

export class UpdateTaskDto {
  @IsOptional()
  @IsUUID()
  vipTierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(taskTypes)
  type?: (typeof taskTypes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsString()
  targetUrl?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  reward?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
