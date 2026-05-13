import { IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(3)
  public username!: string;

  @IsString()
  @MinLength(6)
  public password!: string;
}
