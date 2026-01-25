import { validate } from 'class-validator';
import { LoginSlugDTO } from './login-slug.dto';

describe(LoginSlugDTO.name, () => {
  it('should contain slug', async () => {
    const loginSlugDto = new LoginSlugDTO();

    const error = await validate(loginSlugDto);
    const slugError = error.find((el) => el.property === 'slug');

    expect(slugError).toBeDefined();
    expect(slugError?.constraints).toEqual({
      isNotEmptyString: 'slug should not be an empty string',
      isString: 'slug must be a string',
    });
  });

  it('should validate with valid values (any string)', async () => {
    const loginSlugDto = new LoginSlugDTO();
    loginSlugDto.slug = 'test@user.com';

    const error = await validate(loginSlugDto);

    expect(error.length).toBe(0);
    expect(loginSlugDto).toEqual({
      slug: 'test@user.com',
    });
  });
});
