import { setupServer } from 'msw/node';
import { handlers } from './handlers/dashboard.handlers';

export const server = setupServer(...handlers);
