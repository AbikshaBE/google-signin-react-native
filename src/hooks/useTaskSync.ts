import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch, useAppSelector } from './index';
import { fetchTasks, syncOfflineQueue } from '../store/tasksSlice';
import { setIsConnected } from '../store/networkSlice';

export function useTaskSync() {
  const dispatch = useAppDispatch();
  const { isConnected } = useAppSelector((state) => state.network);
  const queueLength = useAppSelector((state) => state.tasks?.offlineQueue?.length ?? 0);

  useEffect(() => {
    let isMounted = true;

    const updateConnection = (state: { isConnected: boolean | null }) => {
      dispatch(setIsConnected(Boolean(state.isConnected)));
    };

    NetInfo.fetch().then((state) => {
      if (isMounted) {
        updateConnection(state);
      }
    });

    const unsubscribe = NetInfo.addEventListener(updateConnection);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isConnected === null) {
      return;
    }
    dispatch(fetchTasks());
  }, [dispatch, isConnected]);

  useEffect(() => {
    if (isConnected && queueLength > 0) {
      dispatch(syncOfflineQueue()).finally(() => {
        dispatch(fetchTasks());
      });
    }
  }, [dispatch, isConnected, queueLength]);
}

