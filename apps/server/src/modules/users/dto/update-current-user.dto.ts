import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  public nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  public avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  public profileSignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public phoneMasked?: string;
}
