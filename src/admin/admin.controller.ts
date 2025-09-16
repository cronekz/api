import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('dashboard')
  getDashboard(@Request() req) {
    return {
      message: 'Bem-vindo ao painel administrativo',
      user: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('users')
  getUsers(@Request() req) {
    return {
      message: 'Lista de usuários (apenas para administradores)',
      user: req.user,
      users: [], // Aqui você implementaria a lógica para buscar usuários
    };
  }
}
