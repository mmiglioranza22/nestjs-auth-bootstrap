import { AUTHENTICATION_COOKIE } from '../constants';

export interface SignedCookies {
  [AUTHENTICATION_COOKIE]: string;
}
