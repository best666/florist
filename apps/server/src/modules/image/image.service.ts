import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { CompressImageDto } from './dto/compress-image.dto';

export interface CompressImageResponse {
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

function parseDataUrl(dataUrl: string): { mimeType: string, buffer: Buffer } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new BadRequestException('仅支持 data URL 图片压缩请求');
  }

  const mimeType = match[1] ?? 'image/jpeg';
  const base64Payload = match[2] ?? '';

  return {
    mimeType,
    buffer: Buffer.from(base64Payload, 'base64'),
  };
}

@Injectable()
export class ImageService {
  public async compressImage(payload: CompressImageDto): Promise<CompressImageResponse> {
    const parsedImage = parseDataUrl(payload.dataUrl);
    const transformer = sharp(parsedImage.buffer).rotate();
    const metadata = await transformer.metadata();
    const resizedBuffer = await transformer
      .resize({
        width: payload.maxWidth ?? 1280,
        withoutEnlargement: true,
      })
      .jpeg({ quality: payload.quality ?? 72 })
      .toBuffer();

    return {
      dataUrl: `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`,
      width: metadata.width ?? payload.maxWidth ?? 0,
      height: metadata.height ?? 0,
      originalBytes: parsedImage.buffer.byteLength,
      compressedBytes: resizedBuffer.byteLength,
    };
  }
}
