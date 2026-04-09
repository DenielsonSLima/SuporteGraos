import { Advance as _Advance } from './types';
import { advancesLoader } from './loader';
import { advancesActions } from './actions';
import { advancesRealtime } from './realtime';

export type Advance = _Advance;

export const advancesService = {
  ...advancesLoader,
  ...advancesActions,
  ...advancesRealtime,
};
