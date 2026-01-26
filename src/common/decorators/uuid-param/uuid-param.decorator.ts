import { Param, ParseUUIDPipe } from '@nestjs/common';

export const UUIDParam = (param: string) => {
  return Param(param, ParseUUIDPipe);
};
