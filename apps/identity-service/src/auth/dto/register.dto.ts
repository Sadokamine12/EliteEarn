import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

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

  @IsString()
  @Length(4, 20)
  referralCode!: string;
}
