import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export function generateAdminToken(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET || 'change-me-in-production';
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex');
}

export function verifyAdminToken(token: string): boolean {
  try {
    const expected = generateAdminToken();
    const tokenBuf = Buffer.from(token, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

@Controller('auth')
export class AuthController {
  @Post('admin')
  adminLogin(@Body() body: { password: string }) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || body.password !== adminPassword) {
      throw new UnauthorizedException('Incorrect password');
    }
    return { token: generateAdminToken() };
  }
}
