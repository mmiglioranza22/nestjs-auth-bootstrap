import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/resources/auth/guards/jwt-auth/jwt-auth.guard';

export const Private = () => UseGuards(JwtAuthGuard);
