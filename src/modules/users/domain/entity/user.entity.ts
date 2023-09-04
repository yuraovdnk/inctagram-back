import { AggregateRoot } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../events/user.created.event';
import { v4 as uuid } from 'uuid';
import { ExternalAccountEntity } from './external-account.entity';
import { UserProfileEntity } from './user-profile.entity';
import { UserProfileDto } from '../../application/dto/request/user-profile.dto';

export class UserEntity extends AggregateRoot {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  passwordHash: string;
  isConfirmedEmail: boolean;
  externalAccounts: ExternalAccountEntity[] = [];
  profile?: UserProfileEntity;
  constructor() {
    super();
  }

  static create(
    username: string,
    email: string,
    passwordHash: string,
    isConfirmed = false,
  ) {
    const user = new UserEntity();
    user.id = uuid();
    user.email = email;
    user.username = username;
    user.passwordHash = passwordHash;
    user.isConfirmedEmail = isConfirmed;
    user.apply(new UserCreatedEvent(user));
    return user;
  }

  confirmEmail() {
    this.isConfirmedEmail = true;
  }

  updateUsername(username: string) {
    this.username = username;
  }
  setProfile(dto: UserProfileDto) {
    this.username = dto.username;
    this.profile = new UserProfileEntity(dto);
  }
}
