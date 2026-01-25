import { PartialType } from '@nestjs/swagger';
import { CreateUserDTO } from './create-user.dto';
import { UpdateUserDTO } from './update-user.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe(UpdateUserDTO.name, () => {
  // Hack to check class extends from PartialType and corresponding CreateDTO class (PartialType returns a new class)
  it(`should extend from ${CreateUserDTO.name} as a PartialType`, () => {
    [PartialType.name, CreateUserDTO.name].forEach((name) => {
      expect(UpdateUserDTO.toString().indexOf(name)).not.toBe(-1);
    });
  });

  it('should return errors if provided optionals fields are invalid', async () => {
    const input = { oldPassword: 123 };
    const dtoInstance = plainToInstance(UpdateUserDTO, input);

    const errors = await validate(dtoInstance);
    const oldPasswordError = errors.find((el) => el.property === 'oldPassword');

    expect(errors.length).toBe(1);
    expect(oldPasswordError).toBeDefined();
    expect(oldPasswordError?.constraints).toEqual({
      isNotEmptyString: 'oldPassword should not be an empty string',
      isString: 'oldPassword must be a string',
    });
  });

  it('should allow all props to be optional', async () => {
    const dto = new UpdateUserDTO();

    const error = await validate(dto);

    expect(error.length).toBe(0);
    expect(dto).toEqual({});
  });
});
