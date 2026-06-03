import { IsString, Matches } from 'class-validator';

export class SendBindPhoneCodeDto {
  @IsString()
  @Matches(/^1\d{10}$/, { message: '请输入正确的 11 位手机号' })
  public phoneNumber!: string;
}
