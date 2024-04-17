import { GameMachineContext, MenuMachineContext, RootMachineContext } from './RootMachineContext';

export function useRootMachine() {
  const { send } = RootMachineContext.useActorRef();
  const state = RootMachineContext.useSelector((state) => state);

  return [state, send] as const;
}

// TODO: separate to its own file
export function useMenuMachine() {
  const { send } = MenuMachineContext.useActorRef();
  const state = MenuMachineContext.useSelector((state) => state);

  return [state, send] as const;
}

// TODO: separate to its own file
export function useGameMachine() {
  const { send } = GameMachineContext.useActorRef();
  const state = GameMachineContext.useSelector((state) => state);

  return [state, send] as const;
}
