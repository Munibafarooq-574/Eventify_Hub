// fyp-backend/src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { User, UserSchema } from '../schemas/user.schema';
import { Reviews, ReviewsSchema } from '../schemas/reviews.schema';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Message, MessageSchema } from '../schemas/message.schema';
import { Review, ReviewSchema } from '../schemas/review.schema';
import {
  Notification,
  NotificationSchema,
} from '../schemas/notification.schema';

import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';

import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';

import { FileUploadService } from '../file-upload/file-upload.service';

@Module({
  imports: [
    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => {
        const secret =
          configService.get<string>(
            'JWT_SECRET',
          );

        if (!secret) {
          throw new Error(
            'JWT_SECRET is not configured',
          );
        }

        return {
          secret,

          signOptions: {
            expiresIn: '1d',
          },
        };
      },
    }),

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Reviews.name,
        schema: ReviewsSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: Message.name,
        schema: MessageSchema,
      },
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    FileUploadService,

    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,

    JwtAuthGuard,
    AdminRoleGuard,
  ],

  exports: [
    JwtAuthGuard,
    AdminRoleGuard,
  ],
})
export class AuthModule {}