import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { configureRegistry } from '@quarks.studio/registry';
import App from './app/app';

export default function ManagerApp({ apiUrl = '/v1' }: { apiUrl?: string }) {
  configureRegistry(apiUrl);
  return (
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}
