import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerDriver(registerDriverDto: RegisterDriverDto) {
    const { name, email, phone, password } = registerDriverDto;

    // Verificar se já existe um usuário com o mesmo email ou telefone
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email ou telefone já cadastrado');
    }

    // Fazer hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Gerar token de verificação de e-mail
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiresAt = new Date();
    emailVerificationTokenExpiresAt.setHours(emailVerificationTokenExpiresAt.getHours() + 24);

    // Criar o usuário
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: UserRole.DRIVER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerificationToken,
        emailVerificationTokenExpiresAt,
      },
    });

    // TODO: Disparar evento ou chamar EmailService para enviar e-mail de verificação
    // Por enquanto, apenas logamos o token para desenvolvimento
    console.log(`Token de verificação para ${email}: ${emailVerificationToken}`);

    return {
      message: 'Motorista cadastrado com sucesso. Verifique seu e-mail para ativar a conta.',
      userId: user.id,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificação inválido');
    }

    if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token de verificação expirado');
    }

    // Atualizar o usuário
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.APPROVED,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return {
      message: 'E-mail verificado com sucesso. Sua conta foi ativada.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar o usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se o status do usuário é APPROVED
    if (user.status !== UserStatus.APPROVED) {
      throw new UnauthorizedException('Sua conta ainda não foi aprovada.');
    }

    // Comparar a senha
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gerar JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== UserStatus.APPROVED) {
      return null;
    }

    return user;
  }
}
