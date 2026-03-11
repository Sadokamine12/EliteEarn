import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can only include letters, numbers, and underscores',
  })
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
