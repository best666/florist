import type { CommunityFeedbackResponse, IFeedback } from '@florist/contracts';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AddCommentDto, CommunityFeedbackQueryDto } from './dto/community-feedback.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  public constructor(private readonly feedbackService: FeedbackService) {}

  // ── 个人反馈（登录后查看自己的反馈） ──

  @Get()
  public listFeedbacks(@CurrentUserId() userId?: string): Promise<ReadonlyArray<IFeedback>> {
    return this.feedbackService.listCurrentUserFeedbacks(userId);
  }

  @Post()
  public createFeedback(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: CreateFeedbackDto,
  ): Promise<IFeedback> {
    return this.feedbackService.createFeedback(payload, userId);
  }

  // ── 社区反馈（公开） ──

  @Get('community')
  public listCommunityFeedbacks(
    @Query() query: CommunityFeedbackQueryDto,
    @CurrentUserId() userId?: string,
  ): Promise<CommunityFeedbackResponse> {
    return this.feedbackService.listCommunityFeedbacks(query, userId);
  }

  @Get('community/:id')
  public getCommunityFeedback(
    @Param('id') feedbackId: string,
    @CurrentUserId() userId?: string,
  ): Promise<IFeedback> {
    return this.feedbackService.getCommunityFeedback(feedbackId, userId);
  }

  // ── 投票 ──

  @Post(':id/vote')
  public voteFeedback(
    @Param('id') feedbackId: string,
    @CurrentUserId() userId: string | undefined,
  ): Promise<{ voteCount: number; hasVoted: boolean }> {
    return this.feedbackService.voteFeedback(feedbackId, userId);
  }

  // ── 评论 ──

  @Post(':id/comments')
  public addComment(
    @Param('id') feedbackId: string,
    @CurrentUserId() userId: string | undefined,
    @Body() payload: AddCommentDto,
  ): Promise<IFeedback> {
    return this.feedbackService.addComment(feedbackId, payload, userId);
  }
}
