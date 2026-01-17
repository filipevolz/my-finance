import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.validateUser(loginDto);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    await this.usersService.updateResetPasswordToken(
      email,
      resetToken,
      resetTokenExpires,
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return {
      message: 'E-mail de recuperação de senha enviado com sucesso',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Token inválido');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    await this.usersService.updatePassword(user.id, password);

    return {
      message: 'Senha redefinida com sucesso',
    };
  }
}


