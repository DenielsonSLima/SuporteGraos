import { UserData as _UserData } from './types';
import { userLoader } from './loader';
import { userActions } from './actions';
import { userRealtime } from './realtime';

export type UserData = _UserData;

export const userService = {
  ...userLoader,
  ...userActions,
  ...userRealtime,
};
