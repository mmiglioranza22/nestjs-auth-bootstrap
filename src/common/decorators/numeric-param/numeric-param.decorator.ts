import { Param, ParseIntPipe } from '@nestjs/common';

export const NumericParam = (param: string) => {
  return Param(param, ParseIntPipe);
};
