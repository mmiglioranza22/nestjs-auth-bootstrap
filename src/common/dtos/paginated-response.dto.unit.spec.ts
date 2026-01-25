import 'reflect-metadata';

import { plainToClass } from 'class-transformer';
import { PaginatedResponseDTO } from './paginated-response.dto';
import { validate } from 'class-validator';

describe(PaginatedResponseDTO.name, () => {
  it('should fail with invalid data', async () => {
    const dto = plainToClass(PaginatedResponseDTO<QuestResponseDTO>, {});

    const error = await validate(dto);
    const totalError = error.find((el) => el.property === 'total');
    const limitError = error.find((el) => el.property === 'limit');
    const offsetError = error.find((el) => el.property === 'offset');

    expect(totalError).toBeDefined();
    expect(limitError).toBeDefined();
    expect(offsetError).toBeDefined();
    expect(totalError?.constraints).toEqual({
      isNumber:
        'total must be a number conforming to the specified constraints',
      min: 'total must not be less than 0',
    });
    expect(limitError?.constraints).toEqual({
      isNumber:
        'limit must be a number conforming to the specified constraints',
      max: 'limit must not be greater than 10',
      min: 'limit must not be less than 1',
    });
    expect(offsetError?.constraints).toEqual({
      isNumber:
        'offset must be a number conforming to the specified constraints',
      min: 'offset must not be less than 0',
    });
  });
});
