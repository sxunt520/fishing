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

  app.use((req: any, res: any, next: any) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      const body = summarizeRequestBody(req.body);
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms${body ? ` body=${body}` : ''}`,
      );
    });
    next();
  });

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('');
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('钓点分享 API')
    .setDescription('Fishing Spot Sharing Platform API Docs')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '请输入登录接口返回的 accessToken，不需要添加 Bearer 前缀',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();
  const swagger = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swagger, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 3000);
  console.log(`🎣 Server running on http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();

function summarizeRequestBody(body: any) {
  if (!body || Object.keys(body).length === 0) return '';
  try {
    const seen = new WeakSet();
    const text = JSON.stringify(body, (key, value) => {
      if (/password|token|authorization/i.test(key)) return '[REDACTED]';
      if (value && typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'string' && value.length > 260) return `${value.slice(0, 260)}...`;
      return value;
    });
    return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
  } catch {
    return '[Unserializable Body]';
  }
}
