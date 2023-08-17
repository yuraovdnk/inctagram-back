import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigEnvType } from '../../../../core/common/config/env.config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService<ConfigEnvType, true>,
    private jwtService: JwtService,
  ) {}

  generateTokens(
    userId: string,
    deviceId: string,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(
      { userId, deviceId },
      {
        secret: this.configService.get('secrets', {
          infer: true,
        }).secretAccessToken,
        expiresIn: this.configService.get('secrets', {
          infer: true,
        }).timeExpireAccessToken,
      },
    );

    const refreshToken = this.jwtService.sign(
      { userId, deviceId },
      {
        secret: this.configService.get('secrets', {
          infer: true,
        }).secretRefreshToken,
        expiresIn: this.configService.get('secrets', {
          infer: true,
        }).timeExpireRefreshToken,
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
