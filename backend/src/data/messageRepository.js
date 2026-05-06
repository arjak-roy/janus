export class MessageRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  create(data) {
    return this.prisma.message.create({ data });
  }

  findByRoomId(roomId, limit) {
    return this.prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
  }
}
