import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { AuthProvider } from './AuthProvider';

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}





