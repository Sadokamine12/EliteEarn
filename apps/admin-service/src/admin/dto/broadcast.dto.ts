import { IsOptional, IsString } from 'class-validator';

export class BroadcastDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;
}
