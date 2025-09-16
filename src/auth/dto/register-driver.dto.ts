import { IsString, IsNotEmpty, IsEmail, MinLength, Matches } from 'class-validator';

export class RegisterDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'A senha deve conter ao menos uma letra maiúscula, uma minúscula e um número',
  })
  password: string;
}
