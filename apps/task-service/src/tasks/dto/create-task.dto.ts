import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

const taskTypes = ['review', 'rating', 'survey', 'ad'] as const;

export class CreateTaskDto {
  @IsUUID()
  vipTierId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(taskTypes)
  type!: (typeof taskTypes)[number];

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
