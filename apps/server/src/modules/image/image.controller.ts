import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CompressImageDto } from './dto/compress-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import type { CompressImageResponse } from './image.service';
import type { UploadImageResponse } from './image.service';
import { ImageService } from './image.service';

@Controller('image')
export class ImageController {
  public constructor(private readonly imageService: ImageService) {}

  @Post('compress')
  public compressImage(@Body() payload: CompressImageDto): Promise<CompressImageResponse> {
    return this.imageService.compressImage(payload);
  }

  @Post('upload')
  public uploadImage(
    @CurrentUserId() userId: string | undefined,
    @Body() payload: UploadImageDto,
  ): Promise<UploadImageResponse> {
    return this.imageService.uploadImage(payload, userId);
  }
}
