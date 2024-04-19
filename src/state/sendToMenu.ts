import { EventFrom } from 'xstate';
import { type RootMachineContext } from './RootMachineContext';
import { menuMachine } from './MenuMachineContext';

export function sendToMenu(event: EventFrom<typeof menuMachine>) {
  return ({ context }: { context: RootMachineContext }) => context.menuRef?.send(event);
}
