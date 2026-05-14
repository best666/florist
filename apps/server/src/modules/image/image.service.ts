import fs from 'node:fs';
import path from 'node:path';
import { MemberBenefitType } from '@florist/contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { RuntimeCacheService } from '../../common/services/runtime-cache.service';
import { RequestMonitorService } from '../../common/services/request-monitor.service';
import type { ServerEnvConfig } from '../../config/server-env';
import { MembersService } from '../members/members.service';
import { UsersService } from '../users/users.service';
import { CompressImageDto } from './dto/compress-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';

export interface CompressImageResponse {
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

export interface UploadImageResponse {
  url: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

type UploadCropMode = 'none' | 'square' | 'card';

const DEV_SERVER_RUNTIME_FILE = path.resolve(process.cwd(), '.runtime/dev-server.json');
const UPLOAD_ROOT_DIR = path.resolve(process.cwd(), 'var/uploads');

function resolveOutputFormat(mimeType: string): 'png' | 'jpeg' | 'webp' {
  if (mimeType.includes('png')) {
    return 'png';
  }

  if (mimeType.includes('webp')) {
    return 'webp';
  }

  return 'jpeg';
}

function resolveFileExtension(format: 'png' | 'jpeg' | 'webp'): string {
  if (format === 'png') {
    return 'png';
  }

  if (format === 'webp') {
    return 'webp';
  }

  return 'jpg';
}

function resolveUploadQuality(inputQuality?: number): number {
  return inputQuality ?? 82;
}

function resolveUploadMaxWidth(inputMaxWidth: number | undefined, scope: UploadImageDto['scope']): number {
  if (inputMaxWidth) {
    return inputMaxWidth;
  }

  if (scope === 'avatar') {
    return 720;
  }

  return 1440;
}

function resolveCropMode(payload: UploadImageDto): UploadCropMode {
  if (payload.cropMode) {
    return payload.cropMode;
  }

  return payload.scope === 'avatar' ? 'square' : 'card';
}

function buildCropRegion(
  width: number,
  height: number,
  cropMode: UploadCropMode,
): { left: number, top: number, width: number, height: number } | null {
  if (cropMode === 'none') {
    return null;
  }

  if (cropMode === 'square') {
    const side = Math.min(width, height);
    return {
      left: Math.max(Math.floor((width - side) / 2), 0),
      top: Math.max(Math.floor((height - side) / 2), 0),
      width: side,
      height: side,
    };
  }

  const targetRatio = 4 / 3;
  const currentRatio = width / height;

  if (currentRatio > targetRatio) {
    const croppedWidth = Math.floor(height * targetRatio);
    return {
      left: Math.max(Math.floor((width - croppedWidth) / 2), 0),
      top: 0,
      width: croppedWidth,
      height,
    };
  }

  const croppedHeight = Math.floor(width / targetRatio);
  return {
    left: 0,
    top: Math.max(Math.floor((height - croppedHeight) / 2), 0),
    width,
    height: croppedHeight,
  };
}

function resolveServerOrigin(fallbackPort: number): string {
  try {
    const content = fs.readFileSync(DEV_SERVER_RUNTIME_FILE, 'utf8');
    const runtimeInfo = JSON.parse(content) as { origin?: string };

    if (runtimeInfo.origin) {
      return runtimeInfo.origin;
    }
  }
  catch {
    // ignore runtime file read failures and fall back to configured port.
  }

  return `http://127.0.0.1:${fallbackPort}`;
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
    private readonly usersService: UsersService,
    private readonly membersService: MembersService,
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

  public async uploadImage(payload: UploadImageDto, userIdInput?: string): Promise<UploadImageResponse> {
    const userId = await this.usersService.resolveCurrentUserId(userIdInput);

    if (payload.scope === 'flower' || payload.scope === 'record') {
      const memberAccess = await this.membersService.checkMemberBenefit(MemberBenefitType.CloudBackup, userId);

      if (!memberAccess.allowed) {
        throw new BadRequestException('当前账号还未开通会员，植物相册与云端图片上传暂不可用');
      }
    }

    const parsedImage = parseDataUrl(payload.dataUrl);
    const cropMode = resolveCropMode(payload);
    const maxWidth = resolveUploadMaxWidth(payload.maxWidth, payload.scope);
    const quality = resolveUploadQuality(payload.quality);
    const startedAt = Date.now();
    const metadata = await sharp(parsedImage.buffer).rotate().metadata();
    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;

    if (originalWidth <= 0 || originalHeight <= 0) {
      throw new BadRequestException('图片尺寸解析失败，请重新选择一张清晰图片');
    }

    const cropRegion = buildCropRegion(originalWidth, originalHeight, cropMode);
    const format = resolveOutputFormat(parsedImage.mimeType);
    const transformedPipeline = cropRegion
      ? sharp(parsedImage.buffer).rotate().extract(cropRegion)
      : sharp(parsedImage.buffer).rotate();
    const resizedPipeline = transformedPipeline.resize({
      width: maxWidth,
      withoutEnlargement: true,
    });
    const outputBuffer = format === 'png'
      ? await resizedPipeline.png({ quality }).toBuffer()
      : format === 'webp'
        ? await resizedPipeline.webp({ quality }).toBuffer()
        : await resizedPipeline.jpeg({ quality }).toBuffer();
    const outputMetadata = await sharp(outputBuffer).metadata();
    const extension = resolveFileExtension(format);
    const dayKey = new Date().toISOString().slice(0, 10);
    const fileDir = path.join(UPLOAD_ROOT_DIR, payload.scope, dayKey);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const filePath = path.join(fileDir, fileName);
    const relativeUrl = `/uploads/${payload.scope}/${dayKey}/${fileName}`;

    fs.mkdirSync(fileDir, { recursive: true });
    fs.writeFileSync(filePath, outputBuffer);

    await this.requestMonitorService.logProxyRequest({
      scope: 'image',
      endpoint: `upload:${payload.scope}`,
      userId,
      cacheHit: false,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      upstreamProvider: 'sharp-local-upload',
    });

    return {
      url: `${resolveServerOrigin(this.appEnv.port)}${relativeUrl}`,
      width: outputMetadata.width ?? maxWidth,
      height: outputMetadata.height ?? outputMetadata.width ?? maxWidth,
      originalBytes: parsedImage.buffer.byteLength,
      compressedBytes: outputBuffer.byteLength,
    };
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
