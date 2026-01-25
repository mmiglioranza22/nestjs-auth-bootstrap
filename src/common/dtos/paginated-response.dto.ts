import { IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDTO<T> {
  @Min(1)
  @Max(10)
  @IsNumber()
  limit?: number;

  @IsNumber()
  @Min(0)
  offset?: number;

  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ type: () => 'T[]' })
  results: T[];
}
