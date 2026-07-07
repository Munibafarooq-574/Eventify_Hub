import { Controller, Post, Body, Get, UseGuards, Req, Patch, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { SearchVendorsDto } from './dto/search-vendors.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Patch('update')
  async updateProfile(@Body() updateDto: UpdateUserProfileDto) {
    return this.authService.updateUser(updateDto);
  }

  @Post('push-token')
  async updatePushToken(@Body() body: UpdatePushTokenDto) {
    return this.authService.updatePushToken(body);
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    const users = await this.authService.searchUsers(query);
    return users;
  }

  @Get('vendor-search')
  async searchVendors(@Query() filters: SearchVendorsDto) {
    return this.authService.searchVendorsByFilters(filters);
  }

  // @Get('google')
  // @UseGuards(AuthGuard('google'))
  // googleAuth() {}

  // @Get('google/callback')
  // @UseGuards(AuthGuard('google'))
  // googleAuthCallback(@Req() req) {
  //   return this.authService.validateOAuthUser(req.user, 'google');
  // }

  // @Get('facebook')
  // @UseGuards(AuthGuard('facebook'))
  // facebookAuth() {}

  // @Get('facebook/callback')
  // @UseGuards(AuthGuard('facebook'))
  // facebookAuthCallback(@Req() req) {
  //   return this.authService.validateOAuthUser(req.user, 'facebook');
  // }
}