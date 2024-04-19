import { EventFrom } from 'xstate';
import { type RootMachineContext } from './RootMachineContext';
import { gameMachine } from './GameMachineContext';

export function sendToGame(event: EventFrom<typeof gameMachine>) {
  return ({ context }: { context: RootMachineContext }) => context.gameRef?.send(event);
}
