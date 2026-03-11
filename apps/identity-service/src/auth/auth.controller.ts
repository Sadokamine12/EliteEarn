import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, {
      ipAddress: request.ip,
      userAgent: this.getUserAgent(request),
    });
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: this.getUserAgent(request),
    });
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto, {
      ipAddress: request.ip,
      userAgent: this.getUserAgent(request),
    });
  }

  private getUserAgent(request: Request): string | undefined {
    const header = request.headers['user-agent'];
    return Array.isArray(header) ? header.join(' ') : header;
  }
}
