import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateBoundaryTestsDto {
  @IsNotEmpty({ message: 'Tiêu đề bài toán không được để trống' })
  @IsString()
  problemTitle: string;

  @IsNotEmpty({ message: 'Mô tả bài toán không được để trống' })
  @IsString()
  problemDescription: string;

  @IsNotEmpty({ message: 'Mã nguồn giải mẫu không được để trống' })
  @IsString()
  solutionCode: string;

  @IsNotEmpty({ message: 'Ngôn ngữ giải mẫu không được để trống' })
  @IsString()
  language: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  numCases?: number;
}
