import 'reflect-metadata';

import { plainToClass, plainToInstance } from 'class-transformer';
import { PaginationDTO } from './pagination.dto';
import { validate } from 'class-validator';

describe(PaginationDTO.name, () => {
  it('should validate limit as equal or bigger than 1', async () => {
    const dto = plainToClass(PaginationDTO, { limit: 0 });

    const error = await validate(dto);
    const limitError = error.find((el) => el.property === 'limit');

    expect(limitError).toBeDefined();
    expect(limitError?.constraints).toEqual({
      min: 'limit must not be less than 1',
    });
  });

  it('should validate offset as a positive number', async () => {
    const dto = plainToClass(PaginationDTO, { offset: -1 });

    const error = await validate(dto);
    const offsetError = error.find((el) => el.property === 'offset');

    expect(offsetError).toBeDefined();
    expect(offsetError?.constraints).toEqual({
      min: 'offset must not be less than 0',
    });
  });

  it('should validate with valid data', async () => {
    const dto = new PaginationDTO();

    dto.limit = 10;
    dto.offset = 1;

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should convert strings into numbers', async () => {
    const input = { limit: '10', offset: '2' };
    const dto = plainToInstance(PaginationDTO, input);

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.limit).toBe(10);
    expect(dto.offset).toBe(2);
  });
});
