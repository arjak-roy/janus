export class HealthService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async checkHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'janus-backend', database: 'connected' };
  }
}
