import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginWechatUserDto {
  @IsString()
  @MaxLength(256)
  public code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  public avatarUrl?: string;
}
