import { createBrowserInspector } from '@statelyai/inspect';
import { createActorContext } from '@xstate/react';
import { ActorOptions, assign, setup } from 'xstate';
import { Player, PositionKey } from '../types';
import { isDevelopmentMode } from '../isDevelopmentMode';

type GameMachineContext = {
  isPaused: boolean;
  currentPlayer: Player | undefined;
  selectedPosition?: { player: Player; position: PositionKey; x: number; y: number };
  positions: Map<PositionKey, Player>;
  animations: Map<AnimationKey, Animation[]>;
};

type AnimationKey = 'intro' | 'xPlayerTurn' | 'oPlayerTurn' | 'playerMove';
export type Animation = (context: GameMachineContext) => void;

function playAnimations(key: AnimationKey) {
  return async ({ context }: { context: GameMachineContext }) =>
    context.animations.get(key)?.forEach((animation) => animation(context));
}

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as
      | { type: 'newGame' }
      | { type: 'resume' }
      | { type: 'pause' }
      | { type: 'selected'; position: PositionKey; x: number; y: number }
      | { type: 'transitionEnd' }
      | { type: 'registerAnimation'; key: AnimationKey; animation: Animation }
      | { type: 'unregisterAnimation'; key: AnimationKey; animation: Animation },
  },
}).createMachine({
  id: 'game',
  initial: 'idle',
  context: {
    isPaused: false,
    currentPlayer: undefined,
    positions: new Map<PositionKey, Player>(),
    animations: new Map<AnimationKey, Animation[]>(),
  },
  states: {
    idle: {
      on: { newGame: 'new' },
    },
    new: {
      entry: playAnimations('intro'),
      on: {
        transitionEnd: 'xPlayerTurn',
      },
    },
    xPlayerTurn: {
      tags: ['initialized', 'selectable'],
      entry: [assign({ currentPlayer: 'x' }), playAnimations('xPlayerTurn')],
      on: {
        selected: {
          guard: ({ context, event }) => {
            const { position } = event;
            const { isPaused, positions } = context;

            return !isPaused && !positions.has(position);
          },
          actions: assign(({ context, event }) => ({
            positions: new Map(context.positions).set(event.position, 'x' as Player),
            selectedPosition: { player: 'x', position: event.position, x: event.x, y: event.y },
          })),
          target: 'xPlayerMove',
        },
      },
    },
    xPlayerMove: {
      tags: 'initialized',
      entry: playAnimations('playerMove'),
      on: {
        transitionEnd: 'oPlayerTurn',
      },
    },
    oPlayerTurn: {
      tags: ['initalized', 'selectable'],
      entry: [assign({ currentPlayer: 'o' }), playAnimations('oPlayerTurn')],
      on: {
        selected: {
          guard: ({ context, event }) => {
            const { position } = event;
            const { isPaused, positions } = context;

            return !isPaused && !positions.has(position);
          },
          actions: assign(({ context, event }) => ({
            positions: new Map(context.positions).set(event.position, 'o' as Player),
            selectedPosition: { player: 'o', position: event.position, x: event.x, y: event.y },
          })),
          target: 'oPlayerMove',
        },
      },
    },
    oPlayerMove: {
      tags: 'initialized',
      entry: playAnimations('playerMove'),
      on: {
        transitionEnd: 'xPlayerTurn',
      },
    },
  },
  on: {
    newGame: {
      actions: assign({
        isPaused: false,
        currentPlayer: undefined,
        selectedPosition: undefined,
        positions: new Map<PositionKey, Player>(),
      }),
      target: '.new',
    },
    pause: {
      actions: assign({ isPaused: true }),
    },
    resume: {
      actions: assign({ isPaused: false }),
    },
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

const options: ActorOptions<typeof gameMachine> = {};

if (isDevelopmentMode) {
  const { inspect } = createBrowserInspector();

  options.inspect = inspect;
}

export const GameMachineContext = createActorContext(gameMachine, options);
