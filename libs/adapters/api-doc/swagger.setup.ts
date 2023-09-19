import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createWriteStream } from 'fs';
import { get } from 'http';
import process from 'process';

export class SwaggerConfig {
  static setup(app: INestApplication) {
    const config = new DocumentBuilder()
      .setTitle('Inctagram')
      .setDescription('The Inctagram API description')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT accessToken in headers',
          in: 'header',
        },
        'accessToken',
      )
      .addCookieAuth(
        'refreshToken',
        {
          type: 'apiKey',
          in: 'cookie',
        },
        'refreshToken',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }
  static writeSwaggerFile() {
    const serverUrl = `http://localhost:${process.env.PORT || 3000}`;

    if (process.env.NODE_ENV === 'development') {
      // write swagger ui files
      get(`${serverUrl}/swagger/swagger-ui-bundle.js`, function (response) {
        response.pipe(createWriteStream('swagger-static/swagger-ui-bundle.js'));
        console.log(
          `Swagger UI bundle file written to: '/swagger-static/swagger-ui-bundle.js'`,
        );
      });

      get(`${serverUrl}/swagger/swagger-ui-init.js`, function (response) {
        response.pipe(createWriteStream('swagger-static/swagger-ui-init.js'));
        console.log(
          `Swagger UI init file written to: '/swagger-static/swagger-ui-init.js'`,
        );
      });

      get(
        `${serverUrl}/swagger/swagger-ui-standalone-preset.js`,
        function (response) {
          response.pipe(
            createWriteStream('swagger-static/swagger-ui-standalone-preset.js'),
          );
          console.log(
            `Swagger UI standalone preset file written to: '/swagger-static/swagger-ui-standalone-preset.js'`,
          );
        },
      );

      get(`${serverUrl}/swagger/swagger-ui.css`, function (response) {
        response.pipe(createWriteStream('swagger-static/swagger-ui.css'));
        console.log(
          `Swagger UI css file written to: '/swagger-static/swagger-ui.css'`,
        );
      });
    }
  }
}