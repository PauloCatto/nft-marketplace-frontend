import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { socketHandler } from './socket/socketHandler';

export const server = setupServer(...handlers, socketHandler);
