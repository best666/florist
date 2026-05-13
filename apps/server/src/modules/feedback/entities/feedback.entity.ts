import type { IFeedback, IImageAsset } from '@florist/contracts';
import type { Feedback, FeedbackImage } from '@prisma/client';
import { DatabaseCryptoService } from '../../../common/services/database-crypto.service';

type FeedbackWithImages = Feedback & { images: FeedbackImage[] };

function mapImage(image: FeedbackImage): IImageAsset {
  return {
    id: image.id,
    url: image.url,
    ...(image.compressedUrl ? { compressedUrl: image.compressedUrl } : {}),
    createdAt: image.createdAt.toISOString(),
  };
}

export function toFeedbackEntity(
  feedback: FeedbackWithImages,
  cryptoService: DatabaseCryptoService,
): IFeedback {
  const reply = cryptoService.decryptText(feedback.replyCipher);

  return {
    id: feedback.id,
    content: cryptoService.decryptText(feedback.contentCipher) ?? '',
    images: feedback.images.map(mapImage),
    createdAt: feedback.createdAt.toISOString(),
    status: feedback.status as IFeedback['status'],
    ...(reply && feedback.repliedAt && feedback.repliedBy
      ? {
          reply: {
            content: reply,
            repliedAt: feedback.repliedAt.toISOString(),
            repliedBy: feedback.repliedBy,
          },
        }
      : {}),
  };
}
