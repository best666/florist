import { Body, Controller, Post } from '@nestjs/common';
import { CompressImageDto } from './dto/compress-image.dto';
import type { CompressImageResponse } from './image.service';
import { ImageService } from './image.service';

@Controller('image')
export class ImageController {
  public constructor(private readonly imageService: ImageService) {}

  @Post('compress')
  public compressImage(@Body() payload: CompressImageDto): Promise<CompressImageResponse> {
    return this.imageService.compressImage(payload);
  }
}
