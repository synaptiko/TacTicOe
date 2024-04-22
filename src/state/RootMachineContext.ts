import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';
import { ActorOptions, ActorRefFrom, assign, setup } from 'xstate';
import { gameMachine } from './GameMachineContext';
import { sendToGame } from './sendToGame';
import { menuMachine } from './MenuMachineContext';
import { sendToMenu } from './sendToMenu';
import { isDevelopmentMode } from '../isDevelopmentMode';

// TODO: create a set of hooks with selectors (ie. useIsPaused etc.)

export type RootMachineContext = {
  menuRef?: ActorRefFrom<typeof menuMachine>;
  gameRef?: ActorRefFrom<typeof gameMachine>;
};

const rootMachine = setup({
  actors: {
    menu: menuMachine,
    game: gameMachine,
  },
  types: {
    context: {} as RootMachineContext,
    events: {} as
      | { type: 'loaded'; menuRef: ActorRefFrom<typeof menuMachine>; gameRef: ActorRefFrom<typeof gameMachine> }
      | { type: 'newGame' }
      | { type: 'resume' }
      | { type: 'pause' },
  },
}).createMachine({
  id: 'tacTicOe',
  initial: 'loading',
  states: {
    loading: {
      on: {
        loaded: {
          actions: assign({
            menuRef: ({ event }) => event.menuRef,
            gameRef: ({ event }) => event.gameRef,
          }),
          target: 'loaded',
        },
      },
    },
    loaded: {
      entry: sendToMenu({ type: 'ready' }),
      on: {
        newGame: {
          actions: [sendToMenu({ type: 'hide' }), sendToGame({ type: 'newGame' })],
        },
        resume: {
          actions: [sendToMenu({ type: 'hide' }), sendToGame({ type: 'resume' })],
        },
        pause: {
          actions: [sendToMenu({ type: 'show', isPaused: true }), sendToGame({ type: 'pause' })],
        },
        // credits: '#menu.credits',
        // closeCredits: '#menu.shown',
        // quit: '#menu.quit',
      },
    },
  },
});

const options: ActorOptions<typeof rootMachine> = {};

if (isDevelopmentMode) {
  const { inspect } = createBrowserInspector();

  options.inspect = inspect;
}

export const RootMachineContext = createActorContext(rootMachine, options);
