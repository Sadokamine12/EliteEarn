import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only include letters, numbers, and underscores',
  })
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length ? normalized : undefined;
  })
  @IsOptional()
  @IsString()
  @Length(4, 20)
  referralCode?: string;
}
