import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';
import { ActorRefFrom, ContextFrom, EventFrom, assign, setup } from 'xstate';

// TODO: should playing/paused state be a flag inside context instead?
// TODO: create a set of hooks with selectors (ie. useIsPaused etc.)

const menuMachine = setup({
  types: {
    events: {} as { type: 'ready' } | { type: 'show' } | { type: 'hide' } | { type: 'transitionEnd' },
  },
}).createMachine({
  id: 'menu',
  initial: 'idle',
  states: {
    idle: {
      on: { ready: 'ready' },
    },
    ready: {
      tags: 'visible',
      after: { 0: 'animateIn' },
    },
    animateIn: {
      tags: 'visible',
      on: { transitionEnd: 'shown' },
    },
    shown: {
      tags: 'visible',
      on: {
        hide: 'animateOut',
      },
    },
    animateOut: {
      tags: 'visible',
      on: { transitionEnd: 'hidden' },
    },
    hidden: {
      on: { show: 'ready' },
    },
  },
});

const gameMachine = setup({
  types: {
    events: {} as { type: 'newGame' } | { type: 'resume' } | { type: 'pause' } | { type: 'transitionEnd' },
  },
}).createMachine({
  id: 'game',
  initial: 'idle',
  states: {
    idle: {
      on: { newGame: 'new', resume: 'resume' },
    },
    new: {
      on: {
        transitionEnd: 'xPlayerTurn',
      },
    },
    resume: {
      // TODO: we need to remember the game state and resume it
      on: { transitionEnd: 'xPlayerTurn' },
    },
    xPlayerTurn: {
      tags: 'resumable',
      on: {
        // selected: {
        //   actions: 'playerMove',
        //   target: 'oPlayerTurn',
        // },
        newGame: 'new',
      },
    },
    oPlayerTurn: {
      tags: 'resumable',
      on: {
        // selected: {
        //   actions: 'playerMove',
        //   target: 'xPlayerTurn',
        // },
        newGame: 'new',
      },
    },
  },
});

function sendToMenu(event: EventFrom<typeof menuMachine>) {
  return ({ context }: { context: ContextFrom<typeof menuMachine> }) => context.menuRef?.send(event);
}

function sendToGame(event: EventFrom<typeof gameMachine>) {
  return ({ context }: { context: ContextFrom<typeof gameMachine> }) => context.gameRef?.send(event);
}

const rootMachine = setup({
  actors: {
    menu: menuMachine,
    game: gameMachine,
  },
  types: {
    context: {} as {
      menuRef?: ActorRefFrom<typeof menuMachine>;
      gameRef?: ActorRefFrom<typeof gameMachine>;
    },
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
          actions: [sendToMenu({ type: 'show' }), sendToGame({ type: 'pause' })],
        },
        // credits: '#menu.credits',
        // closeCredits: '#menu.shown',
        // quit: '#menu.quit',
      },
    },
  },
});

const { inspect } = createBrowserInspector();

// TODO: separate to its own file
export const MenuMachineContext = createActorContext(menuMachine, { inspect });
// TODO: separate to its own file
export const GameMachineContext = createActorContext(gameMachine, { inspect });
export const RootMachineContext = createActorContext(rootMachine, { inspect });
