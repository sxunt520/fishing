import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 增大 JSON 请求体限制，例如设置为 10MB
  app.use(bodyParser.json({ limit: '10mb' }));
  // 如果也使用了 urlencoded 格式，同样调整
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('钓点分享 API')
    .setDescription('Fishing Spot Sharing Platform API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swagger = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swagger);

  await app.listen(process.env.PORT || 3000);
  console.log(`🎣 Server running on http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();
