import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { RuntimeCacheService } from '../../common/services/runtime-cache.service';
import { RequestMonitorService } from '../../common/services/request-monitor.service';
import type { ServerEnvConfig } from '../../config/server-env';
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
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    configService: ConfigService,
    private readonly runtimeCacheService: RuntimeCacheService,
    private readonly requestMonitorService: RequestMonitorService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  private async compressImageInternal(
    payload: CompressImageDto,
    endpoint: string,
  ): Promise<CompressImageResponse> {
    const parsedImage = parseDataUrl(payload.dataUrl);
    const requestHash = this.requestMonitorService.createPayloadHash('image', {
      dataUrl: payload.dataUrl.slice(0, 128),
      maxWidth: payload.maxWidth,
      quality: payload.quality,
      endpoint,
    });
    const startedAt = Date.now();
    const { value, cacheHit } = await this.runtimeCacheService.remember<CompressImageResponse>(
      `image:${requestHash}`,
      this.appEnv.imageCacheTtlMs,
      async () => {
        const rotatedBuffer = await sharp(parsedImage.buffer).rotate().toBuffer();
        const resizedBuffer = await sharp(rotatedBuffer)
          .resize({
            width: payload.maxWidth ?? 1280,
            withoutEnlargement: true,
          })
          .jpeg({ quality: payload.quality ?? 72 })
          .toBuffer();
        const compressedMetadata = await sharp(resizedBuffer).metadata();

        return {
          dataUrl: `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`,
          width: compressedMetadata.width ?? payload.maxWidth ?? 0,
          height: compressedMetadata.height ?? 0,
          originalBytes: parsedImage.buffer.byteLength,
          compressedBytes: resizedBuffer.byteLength,
        };
      },
    );

    await this.requestMonitorService.logProxyRequest({
      scope: 'image',
      endpoint,
      requestHash,
      cacheHit,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      upstreamProvider: 'sharp',
    });

    return value;
  }

  public async compressImage(payload: CompressImageDto): Promise<CompressImageResponse> {
    return this.compressImageInternal(payload, 'compress');
  }

  public async compressForDiagnosis(dataUrl: string): Promise<CompressImageResponse> {
    return this.compressImageInternal(
      {
        dataUrl,
        maxWidth: 1120,
        quality: 68,
      },
      'diagnosis-compress',
    );
  }
}
