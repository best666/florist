import { IsString, MaxLength } from 'class-validator';

export class H5OneClickLoginDto {
  @IsString()
  @MaxLength(512)
  public spToken!: string;
}
