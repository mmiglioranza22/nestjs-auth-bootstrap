import { Param, ParseUUIDPipe } from '@nestjs/common';

const parser = new ParseUUIDPipe({ version: '4' });

export const UUIDParam = (param: string) => {
  return Param(param, ParseUUIDPipe);
};
