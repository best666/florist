import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterAnonymousUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  public nickname?: string;
}

export class LoginAnonymousUserDto {
  @IsString()
  public userId!: string;
}
