import { AUTHENTICATION_COOKIE_HEADER } from '../constants';

export interface SignedCookies {
  [AUTHENTICATION_COOKIE_HEADER]: string;
}
