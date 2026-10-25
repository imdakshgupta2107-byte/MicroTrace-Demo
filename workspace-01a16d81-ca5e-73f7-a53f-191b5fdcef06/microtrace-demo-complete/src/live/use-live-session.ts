import { useSyncExternalStore } from 'react';
import { readLiveSession,serverLiveSession,subscribeLive } from './session';
export function useLiveSession(){return useSyncExternalStore(subscribeLive,readLiveSession,serverLiveSession);}
