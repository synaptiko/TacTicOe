import { MenuMachineContext } from './MenuMachineContext';

export function useMenuMachine() {
  const { send } = MenuMachineContext.useActorRef();
  const state = MenuMachineContext.useSelector((state) => state);

  return [state, send] as const;
}
