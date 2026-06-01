import type { CommunityFeedbackResponse, IFeedback } from '@florist/contracts';
import { FeedbackStatus } from '@florist/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseCryptoService } from '../../common/services/database-crypto.service';
import { createEntityId } from '../../common/utils/entity-id';
import { AiProxyService } from '../ai-proxy/ai-proxy.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CommunityFeedbackQueryDto, AddCommentDto } from './dto/community-feedback.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto, UpdateFeedbackStatusDto } from './dto/query-feedback.dto';
import { toFeedbackEntity } from './entities/feedback.entity';

const COMMUNITY_INCLUDE = {
  images: true,
  user: { select: { nickname: true, avatarUrl: true } },
  comments: {
    include: { user: { select: { nickname: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class FeedbackService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly cryptoService: DatabaseCryptoService,
    private readonly aiProxyService: AiProxyService,
  ) {}

  public async listCurrentUserFeedbacks(userIdInput?: string): Promise<ReadonlyArray<IFeedback>> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const feedbacks = await this.prisma.feedback.findMany({
      where: { userId },
      include: { images: true, user: { select: { nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return feedbacks.map(f => toFeedbackEntity(f, this.cryptoService, userId));
  }

  public async listAdminFeedbacks(query: QueryFeedbackDto): Promise<ReadonlyArray<IFeedback>> {
    const feedbacks = await this.prisma.feedback.findMany({
      ...(query.status ? { where: { status: query.status } } : {}),
      include: { images: true, user: { select: { nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return feedbacks.map(f => toFeedbackEntity(f, this.cryptoService, null));
  }

  public async createFeedback(payload: CreateFeedbackDto, userIdInput?: string): Promise<IFeedback> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const feedbackId = createEntityId('feedback');
    const now = new Date();

    // AI 内容审核
    let aiResult: { passed: boolean; reason?: string } | null = null;
    try {
      aiResult = await this.aiProxyService.moderateFeedbackContent(payload.content.trim());
    } catch {
      // AI 审核失败时降级为人工审核，状态保持 Pending
      aiResult = null;
    }

    const nextStatus = aiResult?.passed === true
      ? FeedbackStatus.Approved
      : aiResult?.passed === false
        ? FeedbackStatus.Rejected
        : FeedbackStatus.Pending;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.feedback.create({
        data: {
          id: feedbackId,
          userId,
          contentCipher: this.cryptoService.encryptText(payload.content.trim()),
          status: nextStatus,
          isPublic: nextStatus === FeedbackStatus.Approved,
          ...(aiResult ? { aiModerationResult: aiResult as unknown as object } : {}),
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
      include: { images: true, user: { select: { nickname: true, avatarUrl: true } } },
    });

    return toFeedbackEntity(feedback, this.cryptoService, userId);
  }

  public async updateFeedbackStatus(feedbackId: string, payload: UpdateFeedbackStatusDto): Promise<IFeedback> {
    await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: payload.status,
        isPublic: payload.status === FeedbackStatus.Approved,
      },
    });

    const feedback = await this.prisma.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
      include: { images: true, user: { select: { nickname: true, avatarUrl: true } } },
    });

    return toFeedbackEntity(feedback, this.cryptoService, null);
  }

  // ── 社区接口 ──

  public async listCommunityFeedbacks(
    query: CommunityFeedbackQueryDto,
    currentUserId?: string,
  ): Promise<CommunityFeedbackResponse> {
    const limit = query.limit;
    const sort = query.sort ?? 'votes';

    const where = { isPublic: true, status: FeedbackStatus.Approved };

    const orderBy = sort === 'newest'
      ? { createdAt: 'desc' as const }
      : { voteCount: 'desc' as const };

    const [items, totalCount] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include: {
          ...COMMUNITY_INCLUDE,
          votes: currentUserId
            ? { where: { userId: currentUserId }, select: { userId: true } }
            : false,
        },
        orderBy: [orderBy, { createdAt: 'desc' as const }],
        ...(query.cursor
          ? { cursor: { id: query.cursor }, skip: 1 }
          : {}),
        take: limit,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    const lastItem = items[items.length - 1];

    return {
      items: items.map(f => toFeedbackEntity(f, this.cryptoService, currentUserId ?? null)),
      nextCursor: items.length === limit && lastItem ? lastItem.id : null,
      totalCount,
    };
  }

  public async getCommunityFeedback(feedbackId: string, currentUserId?: string): Promise<IFeedback> {
    const feedback = await this.prisma.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
      include: {
        ...COMMUNITY_INCLUDE,
        votes: currentUserId
          ? { where: { userId: currentUserId }, select: { userId: true } }
          : false,
      },
    });

    return toFeedbackEntity(feedback, this.cryptoService, currentUserId ?? null);
  }

  public async voteFeedback(feedbackId: string, userIdInput?: string): Promise<{ voteCount: number; hasVoted: boolean }> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const voteId = createEntityId('vote');

    // 检查是否已投票
    const existingVote = await this.prisma.feedbackVote.findUnique({
      where: { feedbackId_userId: { feedbackId, userId } },
    });

    if (existingVote) {
      // 取消投票
      await this.prisma.$transaction([
        this.prisma.feedbackVote.delete({ where: { id: existingVote.id } }),
        this.prisma.feedback.update({
          where: { id: feedbackId },
          data: { voteCount: { decrement: 1 } },
        }),
      ]);
    } else {
      // 新增投票
      await this.prisma.$transaction([
        this.prisma.feedbackVote.create({
          data: { id: voteId, feedbackId, userId },
        }),
        this.prisma.feedback.update({
          where: { id: feedbackId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
    }

    const feedback = await this.prisma.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
      select: { voteCount: true },
    });

    return { voteCount: feedback.voteCount, hasVoted: !existingVote };
  }

  public async addComment(
    feedbackId: string,
    payload: AddCommentDto,
    userIdInput?: string,
  ): Promise<IFeedback> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);
    const commentId = createEntityId('comment');

    // 验证反馈存在且已公开
    const feedback = await this.prisma.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
    });

    if (!feedback.isPublic) {
      throw new NotFoundException('该反馈暂未公开，无法评论。');
    }

    await this.prisma.feedbackComment.create({
      data: {
        id: commentId,
        feedbackId,
        userId,
        content: payload.content.trim(),
      },
    });

    return this.getCommunityFeedback(feedbackId, userId);
  }
}
