import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/adapters/database/prisma/prisma.service';
import { EmailConfirmationEntity } from '../../domain/entity/email-confirmation.entity';
import { PasswordRecoveryEntity } from '../../domain/entity/password-recovery.entity';
import { EmailConfirmationCodeMapper } from '../mappers/email-confirmation-code.mapper';
import { AuthSessionMapper } from '../mappers/auth-session.mapper';
import { AuthSessionEntity } from '../../domain/entity/auth-session.entity';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createEmailConfirmCode(
    entity: EmailConfirmationEntity,
    prisma?: PrismaService,
  ) {
    const prismaService = prisma ?? this.prismaService;
    const res = await prismaService.emailConfirmationCode.create({
      data: {
        code: entity.code,
        userId: entity.userId,
        expireAt: entity.expireAt,
      },
    });

    return res;
  }
  async createPasswordRecoveryCode(entity: PasswordRecoveryEntity) {
    const res = await this.prismaService.passwordRecoveryCode.create({
      data: {
        code: entity.code,
        userId: entity.userId,
        expireAt: entity.expireAt,
      },
    });
    console.log('[AuthRepository]: createPasswordRecoveryCode result', res);
    return res;
  }

  async findByConfirmCode(
    code: string,
  ): Promise<EmailConfirmationEntity | null> {
    const confirmCode =
      await this.prismaService.emailConfirmationCode.findFirst({
        where: { code },
        include: {
          user: true,
        },
      });

    return confirmCode
      ? EmailConfirmationCodeMapper.toEntity(confirmCode)
      : null;
  }
  async findAuthSessionByIdAndUserId(
    deviceId: string,
    userId: string,
  ): Promise<AuthSessionEntity | null> {
    const session = await this.prismaService.authSession.findFirst({
      where: {
        userId,
        deviceId,
      },
    });

    return session ? AuthSessionMapper.toEntity(session) : null;
  }

  async createAuthSession(authSession: AuthSessionEntity): Promise<void> {
    const authModel = AuthSessionMapper.toModel(authSession);
    await this.prismaService.authSession.create({
      data: authModel,
    });
  }
  async refreshAuthSession(
    deviceId: string,
    authEntity: AuthSessionEntity,
  ): Promise<void> {
    const model = AuthSessionMapper.toModel(authEntity);
    await this.prismaService.authSession.update({
      where: {
        id: model.id,
      },
      data: model,
    });
  }
}
