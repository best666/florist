import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CompressImageDto } from './dto/compress-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import type { CompressImageResponse } from './image.service';
import type { MulterFile } from './image.service';
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
  @UseInterceptors(FileInterceptor('file'))
  public uploadImage(
    @CurrentUserId() userId: string | undefined,
    @UploadedFile() file: MulterFile,
    @Body() payload: UploadImageDto,
  ): Promise<UploadImageResponse> {
    return this.imageService.uploadImage(file, payload, userId);
  }
}
