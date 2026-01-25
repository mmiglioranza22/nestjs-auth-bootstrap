import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';

export class PaginationDTO {
  @IsOptional()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  // * Other possible props
  // @IsOptional()
  // @IsIn('DESC', 'ASC')
  // order?: 'DESC', 'ASC'

  //@IsOptional()
  // @IsString()
  // groupBy?: string
}
