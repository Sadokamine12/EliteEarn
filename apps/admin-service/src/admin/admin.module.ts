import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AdminController],
  providers: [AdminService, JwtStrategy],
})
export class AdminModule {}
