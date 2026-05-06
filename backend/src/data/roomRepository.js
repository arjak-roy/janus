export class RoomRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findByIdOrJanusId(roomIdentifier) {
    const numeric = Number(roomIdentifier);
    return this.prisma.room.findFirst({
      where: {
        OR: [
          { id: roomIdentifier },
          { janusId: Number.isNaN(numeric) ? -1 : numeric }
        ]
      }
    });
  }

  create(data) {
    return this.prisma.room.create({ data });
  }

  findManyWithMessageCount() {
    return this.prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } }
    });
  }

  findAll() {
    return this.prisma.room.findMany();
  }

  deleteById(id) {
    return this.prisma.room.delete({ where: { id } });
  }
}
