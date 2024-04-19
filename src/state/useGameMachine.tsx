import { GameMachineContext } from './GameMachineContext';

export function useGameMachine() {
  const actorRef = GameMachineContext.useActorRef();
  const state = GameMachineContext.useSelector((state) => state);

  return [state, actorRef.send] as const;
}
