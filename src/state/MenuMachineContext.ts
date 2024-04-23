import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';
import { ActorOptions, assign, setup } from 'xstate';
import { isDevelopmentMode } from '../isDevelopmentMode';

type MenuMachineContext = {
  isPaused?: true;
  animations: Map<AnimationKey, Animation[]>;
};

type AnimationKey = 'in' | 'out';
export type Animation = (context: MenuMachineContext) => void;

function playAnimations(key: AnimationKey) {
  return async ({ context }: { context: MenuMachineContext }) =>
    context.animations.get(key)?.forEach((animation) => animation(context));
}

export const menuMachine = setup({
  types: {
    context: {} as MenuMachineContext,
    events: {} as
      | { type: 'ready' }
      | { type: 'show'; isPaused?: true }
      | { type: 'hide' }
      | { type: 'inAnimationEnd' }
      | { type: 'outAnimationEnd' }
      | { type: 'registerAnimation'; key: AnimationKey; animation: Animation }
      | { type: 'unregisterAnimation'; key: AnimationKey; animation: Animation },
  },
}).createMachine({
  id: 'menu',
  initial: 'idle',
  context: {
    animations: new Map<AnimationKey, Animation[]>(),
  },
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
      entry: playAnimations('in'),
      on: { inAnimationEnd: 'shown' },
    },
    shown: {
      tags: 'visible',
      on: {
        hide: 'animateOut',
      },
    },
    animateOut: {
      tags: 'visible',
      entry: playAnimations('out'),
      on: { outAnimationEnd: 'hidden' },
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
  on: {
    registerAnimation: {
      actions: assign(({ context: { animations }, event }) => ({
        animations: animations.set(event.key, [...(animations.get(event.key) ?? []), event.animation]),
      })),
    },
    unregisterAnimation: {
      actions: assign(({ context: { animations }, event }) => {
        const updatedAnimations = animations.get(event.key)?.filter((animation) => animation !== event.animation);

        if (updatedAnimations?.length === 0) {
          animations.delete(event.key);
        } else if (updatedAnimations) {
          animations.set(event.key, updatedAnimations);
        }

        return { animations };
      }),
    },
  },
});

const options: ActorOptions<typeof menuMachine> = {};

if (isDevelopmentMode) {
  const { inspect } = createBrowserInspector();

  options.inspect = inspect;
}

export const MenuMachineContext = createActorContext(menuMachine, options);
