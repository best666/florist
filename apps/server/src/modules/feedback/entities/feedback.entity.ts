import type { IFeedback, IFeedbackComment, IImageAsset } from '@florist/contracts';
import type { Feedback, FeedbackComment, FeedbackImage, User } from '@prisma/client';
import { DatabaseCryptoService } from '../../../common/services/database-crypto.service';

type UserSlim = Pick<User, 'nickname' | 'avatarUrl'>;
type CommentWithUser = FeedbackComment & { user?: UserSlim | null };

type FeedbackWithRelations = Feedback & {
  images: FeedbackImage[];
  user?: UserSlim | null;
  comments?: CommentWithUser[];
  votes?: { userId: string }[];
};

function mapImage(image: FeedbackImage): IImageAsset {
  return {
    id: image.id,
    url: image.url,
    ...(image.compressedUrl ? { compressedUrl: image.compressedUrl } : {}),
    createdAt: image.createdAt.toISOString(),
  };
}

function mapComment(comment: CommentWithUser): IFeedbackComment {
  return {
    id: comment.id,
    content: comment.content,
    authorName: comment.user?.nickname ?? '匿名花友',
    ...(comment.user?.avatarUrl ? { authorAvatar: comment.user.avatarUrl } : {}),
    createdAt: comment.createdAt.toISOString(),
  };
}

export function toFeedbackEntity(
  feedback: FeedbackWithRelations,
  cryptoService: DatabaseCryptoService,
  currentUserId?: string | null,
): IFeedback {
  const reply = cryptoService.decryptText(feedback.replyCipher);
  const hasVoted = currentUserId
    ? (feedback.votes ?? []).some(v => v.userId === currentUserId)
    : undefined;

  return {
    id: feedback.id,
    content: cryptoService.decryptText(feedback.contentCipher) ?? '',
    images: feedback.images.map(mapImage),
    authorName: feedback.user?.nickname ?? '匿名花友',
    ...(feedback.user?.avatarUrl ? { authorAvatar: feedback.user.avatarUrl } : {}),
    createdAt: feedback.createdAt.toISOString(),
    status: feedback.status as IFeedback['status'],
    isPublic: feedback.isPublic,
    voteCount: feedback.voteCount,
    ...(hasVoted !== undefined ? { hasVoted } : {}),
    ...(reply && feedback.repliedAt && feedback.repliedBy
      ? {
          reply: {
            content: reply,
            repliedAt: feedback.repliedAt.toISOString(),
            repliedBy: feedback.repliedBy,
          },
        }
      : {}),
    ...(feedback.comments
      ? { comments: feedback.comments.map(mapComment) }
      : {}),
  };
}
