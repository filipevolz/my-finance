import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const { email, phone, password, name } = registerDto;

    const existingUserByEmail = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const existingUserByPhone = await this.usersRepository.findOne({
      where: { phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    return await this.usersRepository.save(user);
  }

  async findByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    return user;
  }

  async validateUser(loginDto: LoginDto): Promise<User | null> {
    const { emailOrPhone, password } = loginDto;

    const user = await this.findByEmailOrPhone(emailOrPhone);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async updateResetPasswordToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.usersRepository.update(
      { email },
      {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    );
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id },
    });
  }
}
