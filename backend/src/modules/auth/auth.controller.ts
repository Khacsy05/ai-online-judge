import { Body, Controller, Patch, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import * as Express from 'express'
import { UpdatePasswordDto } from './dto/updatePass.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Express.Response

  ) {
    return this.authService.login(loginDto, response);
  }

  @Post('refreshToken')

  refreshToken(

    @Req() request: Express.Request,

    @Res({ passthrough: true }) response: Express.Response

  ) {
    return this.authService.refreshTokens(request, response)
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Express.Response) {
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Đăng xuất thành công' };
  }

  @Patch('updatePassword')
  updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(updatePasswordDto);
  }

}
