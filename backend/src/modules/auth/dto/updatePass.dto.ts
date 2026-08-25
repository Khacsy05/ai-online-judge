import { IsNotEmpty } from 'class-validator';

export class UpdatePasswordDto {
    @IsNotEmpty({ message: 'Username không được để trống' })
    email!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    oldPassword!: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    newPassword!: string;
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    confirmPassword!: string;
} 