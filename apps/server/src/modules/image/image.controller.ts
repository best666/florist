import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CompressImageDto } from './dto/compress-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import type { CompressImageResponse } from './image.service';
import type { MulterFile } from './image.service';
import type { UploadImageResponse } from './image.service';
import { ImageService } from './image.service';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function imageFileFilter(
  _req: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new BadRequestException('仅支持 JPEG、PNG、WebP、HEIC 格式的图片'), false);
  }
}

@Controller('image')
export class ImageController {
  public constructor(private readonly imageService: ImageService) {}

  @Post('compress')
  public compressImage(@Body() payload: CompressImageDto): Promise<CompressImageResponse> {
    return this.imageService.compressImage(payload);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  public uploadImage(
    @CurrentUserId() userId: string | undefined,
    @UploadedFile() file: MulterFile,
    @Body() payload: UploadImageDto,
  ): Promise<UploadImageResponse> {
    return this.imageService.uploadImage(file, payload, userId);
  }
}
