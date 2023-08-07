import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DbTestHelper } from '../test-helpers/db-test-helper';
import { UserTestHelper } from '../test-helpers/user.test.helper';
import { User } from '@prisma/client';
import { mockToken, userMock, userMock2 } from '../mocks/mocks';
import { UsersRepository } from '../../src/modules/users/instrastructure/repository/users.repository';
import { AuthTestHelper } from '../test-helpers/auth-test.helper';
import { EmailConfirmationEntity } from '../../src/modules/auth/domain/entity/email-confirmation.entity';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { setupApp } from '../../src/main';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

jest.setTimeout(20000);
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const dbTestHelper = new DbTestHelper();
  const userTestHelper = new UserTestHelper();
  let users: User[];
  let usersRepository: UsersRepository;
  let authHelper: AuthTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app = setupApp(app);
    await app.init();

    await dbTestHelper.clearDb();
    users = await userTestHelper.createUsers(5);
    usersRepository = app.get(UsersRepository);
    authHelper = new AuthTestHelper(app);
  });

  describe('POST:[HOST]/auth/password-recovery', () => {
    it('POST:[HOST]/auth/password-recovery: should return code 400 If email is incorrect', async () => {
      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: 'fake^^gmail.com',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
    it('POST:[HOST]/auth/password-recovery: should return code 204 If the email is correct', async () => {
      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: users[0].email,
        })
        .expect(HttpStatus.NO_CONTENT);
    });
    it('POST:[HOST]/auth/password-recovery: should return code 204 If the email is correct but email is not in dataBase', async () => {
      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: 'email1111@gmail.com',
        })
        .expect(HttpStatus.NO_CONTENT);
    });
    it('POST:[HOST]/auth/password-recovery: should return code 429 If More than 5 attempts from one IP-address during 10 seconds', async () => {
      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: 'email1111@gmail.com',
        })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: 'email1111@gmail.com',
        })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .post('/auth/password-recovery')
        .send({
          email: 'email1111@gmail.com',
        })
        .expect(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  describe('POST:[HOST]/auth/signup - registration', () => {
    it('should not register if username is incorrect', async () => {
      await authHelper.signUp(
        {
          username: 'testusername',
          email: 'email',
          password: '123456',
          passwordConfirm: '123456',
        },
        HttpStatus.BAD_REQUEST,
      );

      await authHelper.signUp(
        {
          username: 'test',
          email: 'email',
          password: '123456',
          passwordConfirm: '123456',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should register user with correct data', async function () {
      await authHelper.signUp(
        {
          username: 'Testuser123',
          email: 'email@gmail.com',
          password: '123456',
          passwordConfirm: '123456',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should not register if email is incorrect ', async function () {
      await authHelper.signUp(
        {
          username: 'Testuser123',
          email: 'email',
          password: '123456',
          passwordConfirm: '123456',
        },
        HttpStatus.BAD_REQUEST,
      );

      await authHelper.signUp(
        {
          username: 'Testuser123',
          email: 'ema@gmail.com',
          password: '123456',
          passwordConfirm: '123456',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should not register if password is incorrect ', async function () {
      await authHelper.signUp(
        {
          username: 'Testuser123',
          email: 'email@gmail.com',
          password: 'password',
          passwordConfirm: 'password',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should not register if confirm password not equal password', async function () {
      await authHelper.signUp(
        {
          username: 'Testuser123',
          email: 'email@gmail.com',
          password: 'password',
          passwordConfirm: 'StrongPassword@',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should register user', async function () {
      await authHelper.signUp(userMock, HttpStatus.NO_CONTENT);

      //if already registered
      await authHelper.signUp(userMock, HttpStatus.BAD_REQUEST);

      //user should be not confirmed
      const user = await usersRepository.findByEmail(userMock.email);
      expect(user.isConfirmedEmail).toBeFalsy();
    });
  });

  describe('POST:[HOST]/auth/registration-confirmation - confirmation email', () => {
    let emailConfirmCode: EmailConfirmationEntity;
    beforeAll(async () => {
      await dbTestHelper.clearDb();
      const createdUser = await authHelper.createUser(userMock);
      emailConfirmCode = await authHelper.createConfirmCode(createdUser, 15);
    });
    it('should not confirm if code is incorrect', async function () {
      await request(app.getHttpServer())
        .post('/auth/registration-confirmation')
        .send({
          code: uuid(),
        })
        .expect(400);
    });

    it('should not confirm if input code value is incorrect ', async function () {
      await request(app.getHttpServer())
        .post('/auth/registration-confirmation')
        .send({
          code: '2fdg342',
        })
        .expect(400);
    });

    it('should confirm password', async function () {
      await request(app.getHttpServer())
        .post('/auth/registration-confirmation')
        .send({
          code: emailConfirmCode.code,
        })
        .expect(204);

      //if already confirmed should throw exception
      await request(app.getHttpServer())
        .post('/auth/registration-confirmation')
        .send({
          code: emailConfirmCode.code,
        })
        .expect(400);
    });

    it('should not confirm if code is expired', async function () {
      const createdUser = await authHelper.createUser(userMock2);
      emailConfirmCode = await authHelper.createConfirmCode(createdUser, 0.1);
      await request(app.getHttpServer())
        .post('/auth/registration-confirmation')
        .send({
          code: emailConfirmCode.code,
        })
        .expect(400);
    });
  });

  describe('POST:[HOST]/auth/login - login', () => {
    beforeAll(async () => {
      await dbTestHelper.clearDb();
    });

    it('should not login if login payload is invalid', async function () {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'gmai.com',
          password: '132',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not login if user is not confirmed', async function () {
      await authHelper.createUser(userMock, false);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userMock.email,
          password: userMock.password,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should login', async function () {
      await authHelper.createUser(userMock2, true);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userMock2.email,
          password: userMock2.password,
        })
        .set('user-agent', 'test')
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('POST:[HOST]/auth/new-password - set new password', () => {
    it('POST:[HOST]/auth/new-password: should return code 400 If the inputModel is incorrect', async () => {
      await request(app.getHttpServer())
        .post('/auth/new-password')
        .send({
          newPassword: 'string',
        })
        .expect(400);
    });
    it('POST:[HOST]/auth/new-password: should return code 400 If the inputModel has incorrect value (for incorrect password length) ', async () => {
      const recoveryCode = await dbTestHelper.getPasswordRecoveryCode(
        users[0].id,
      );
      await request(app.getHttpServer())
        .post('/auth/new-password')
        .send({
          newPassword: 'st',
          recoveryCode,
        })
        .expect(400);
    });
    it('POST:[HOST]/auth/new-password: should return code 400 If  RecoveryCode is incorrect', async () => {
      await request(app.getHttpServer())
        .post('/auth/new-password')
        .send({
          newPassword: 'string',
          recoveryCode: crypto.webcrypto.randomUUID(),
        })
        .expect(400);
    });
    // it('POST:[HOST]/auth/new-password: should return code 204 If code is valid and new password is accepted', async () => {
    //   const recoveryCode = await dbTestHelper.getPasswordRecoveryCode(
    //     users[0].id,
    //   );
    //   await request(app.getHttpServer())
    //     .post('/auth/new-password')
    //     .send({
    //       newPassword: 'newPassword',
    //       recoveryCode,
    //     })
    //     .expect(204);
    // });
  });

  describe('POST:[HOST]/auth/logout - logout from system', () => {
    beforeAll(async () => {
      await dbTestHelper.clearDb();
    });
    it('should not logout if cookie did`t pass', async function () {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not logout if token expired', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', `refreshToken=${mockToken.expired}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should success logout', async function () {
      await authHelper.createUser(userMock, true);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userMock.email,
          password: userMock.password,
        })
        .expect(200);

      const token = res.get('Set-Cookie');
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', token)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  describe('POST:[HOST]/auth/refresh-token - refreshing token', () => {
    beforeAll(async () => {
      await dbTestHelper.clearDb();
    });
    it('should not refresh if cookie did`t pass', async function () {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not refresh if token expired', async function () {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', `refreshToken=${mockToken.expired}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not refresh if user inside token does not exist', async function () {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', `refreshToken=${mockToken.withNotExistingUser}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should refresh pair of tokens', async function () {
      await authHelper.createUser(userMock2, true);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userMock2.email,
          password: userMock2.password,
        })
        .expect(200);

      const token = res.get('Set-Cookie');

      const resBody = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', token)
        .expect(HttpStatus.OK);

      expect(resBody.body.accessToken).toBeDefined();

      setTimeout(async () => {
        await request(app.getHttpServer())
          .post('/auth/refresh-token')
          .set('Cookie', token)
          .expect(HttpStatus.UNAUTHORIZED);
      }, 1);
      //if try with old tokens
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
