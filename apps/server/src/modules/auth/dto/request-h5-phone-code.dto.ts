import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class RequestH5PhoneCodeDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '手机号格式不正确',
  })
  public phoneNumber!: string;

  @IsString()
  @Length(32, 36)
  public captchaId!: string;

  @IsString()
  @MaxLength(10)
  public captchaAnswer!: string;
}
