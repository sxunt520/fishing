import { IsString, Length, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(11, 11, { message: '手机号必须是11位' })
  phone: string;

  @IsString()
  @Length(6, 20, { message: '密码长度6-20位' })
  password: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @IsString()
  @Length(11, 11)
  phone: string;

  @IsString()
  @Length(6, 20)
  password: string;
}
