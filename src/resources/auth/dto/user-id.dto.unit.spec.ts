import { generateRandomUUID } from 'src/utils';
import { UserIdDTO } from './user-id.dto';
import { validate } from 'class-validator';

describe(UserIdDTO.name, () => {
  it('should not validate if valid uuid is not provided', async () => {
    const userIdDto = new UserIdDTO();
    userIdDto.userId = 'invalid-uuid-1233-4321';

    const error = await validate(userIdDto);
    const userIdError = error.find((el) => el.property === 'userId');

    expect(userIdError).toBeDefined();
    expect(userIdError?.constraints).toEqual({
      isUuid: 'userId must be a UUID',
    });
  });

  it('should validate userId as uuid v4', async () => {
    const userIdDto = new UserIdDTO();
    userIdDto.userId = generateRandomUUID();

    const error = await validate(userIdDto);

    expect(error.length).toBe(0);
  });
});
