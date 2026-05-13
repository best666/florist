import type { IFeedback } from '@florist/contracts';
import { FeedbackStatus } from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { createEntityId } from '../../common/utils/entity-id';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { toFeedbackEntity } from './entities/feedback.entity';

@Injectable()
export class FeedbackService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly cryptoService: DatabaseCryptoService,
  ) {}

  public async listCurrentUserFeedbacks(): Promise<ReadonlyArray<IFeedback>> {
    const userId = await this.usersService.ensureDefaultUserId();
    const feedbacks = await this.prisma.feedback.findMany({
      where: { userId },
      include: { images: true },
      orderBy: { createdAt: 'desc' },
    });

    return feedbacks.map(feedback => toFeedbackEntity(feedback, this.cryptoService));
  }

  public async createFeedback(payload: CreateFeedbackDto): Promise<IFeedback> {
    const userId = await this.usersService.ensureDefaultUserId();
    const feedbackId = createEntityId('feedback');
    const now = new Date();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.feedback.create({
        data: {
          id: feedbackId,
          userId,
          contentCipher: this.cryptoService.encryptText(payload.content.trim()),
          status: FeedbackStatus.Pending,
          createdAt: now,
          updatedAt: now,
        },
      });

      if (payload.images.length > 0) {
        await transaction.feedbackImage.createMany({
          data: payload.images.map(image => ({
            id: image.id || createEntityId('feedback-image'),
            feedbackId,
            url: image.url,
            compressedUrl: image.compressedUrl ?? null,
            createdAt: new Date(image.createdAt),
          })),
        });
      }
    });

    const feedback = await this.prisma.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
      include: { images: true },
    });

    return toFeedbackEntity(feedback, this.cryptoService);
  }
}
