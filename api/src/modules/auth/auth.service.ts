import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '@/entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (exists) throw new ConflictException('该手机号已注册');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      phone: dto.phone,
      nickname: dto.nickname || `钓友${Math.floor(Math.random() * 9999)}`,
      passwordHash: hash,
    });
    await this.userRepo.save(user);
    return this.generateTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('密码错误');

    return this.generateTokens(user.id);
  }

  async getProfile(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    });
  }

  refreshToken(userId: string) {
    return this.generateTokens(userId);
  }

  private generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ userId }, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign({ userId }, { expiresIn: '30d' });
    return { accessToken, refreshToken, expiresIn: 604800 };
  }
}
