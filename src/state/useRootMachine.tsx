import { RootMachineContext } from './RootMachineContext';

export function useRootMachine() {
  const { send } = RootMachineContext.useActorRef();
  const state = RootMachineContext.useSelector((state) => state);

  return [state, send] as const;
}
