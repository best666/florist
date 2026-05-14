import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class LoginH5PhoneUserDto {
  @IsString()
  @Matches(/^1\d{10}$/, {
    message: '手机号格式不正确',
  })
  public phoneNumber!: string;

  @IsString()
  @MaxLength(12)
  public verificationCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  public nickname?: string;
}
