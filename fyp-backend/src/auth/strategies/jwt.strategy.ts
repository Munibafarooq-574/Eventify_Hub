import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model, Types } from 'mongoose';

import { User } from '../../schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    if (
      !payload?.id ||
      !Types.ObjectId.isValid(String(payload.id))
    ) {
      throw new UnauthorizedException(
        'Invalid token payload',
      );
    }

    /*
     * JWT authenticates the request.
     * Current authorization identity is loaded from the database.
     *
     * Do not trust payload.role for req.user authorization.
     */
    const user = await this.userModel
      .findById(payload.id)
      .select('_id role')
      .lean();

    if (!user) {
      throw new UnauthorizedException(
        'Authenticated user no longer exists',
      );
    }

    return {
      id: String(user._id),
      role: user.role,
    };
  }
}
