import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';
import { assign, setup } from 'xstate';

export const menuMachine = setup({
  types: {
    context: {} as {
      isPaused?: true;
    },
    events: {} as { type: 'ready' } | { type: 'show'; isPaused?: true } | { type: 'hide' } | { type: 'transitionEnd' },
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
      on: {
        show: {
          actions: assign({
            isPaused: ({ event: { isPaused } }) => isPaused,
          }),
          target: 'ready',
        },
      },
    },
  },
});
const { inspect } = createBrowserInspector();

export const MenuMachineContext = createActorContext(menuMachine, { inspect });
