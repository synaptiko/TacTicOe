import {
  FormEvent,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  MouseEvent,
} from 'react';
import { Texture, Vector3, WebGLRenderTarget, WebGLRenderer } from 'three';
import classes from './Debugger.module.css';

type DebuggerProps = {
  isEnabled: boolean;
  children: React.ReactNode;
};

export interface IDebug {
  onStartFrame(gl: WebGLRenderer, elapsed: number): void;
  onEndFrame(elapsed: number): void;
  log(key: string, value: string | number): void;
  expose(key: string, texture: Texture): void;
  expose(key: string, renderTarget: WebGLRenderTarget<Texture>): void;
  registerTextureDebugger(key: string, callback: TextureDebuggerCallback): () => void;
  registerRenderTargetDebugger(key: string, callback: RenderTargetDebuggerCallback): () => void;
  subscribeInfo: (onStoreChange: () => void) => () => void;
  getInfo: () => Map<string, [value: string | number, frame: number]>;
  subscribeSnapshots: (onStoreChange: () => void) => () => void;
  getSnapshots: () => Snapshot[];
  isPaused: boolean;
}

type Snapshot = {
  key: string;
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Float32Array;
  description?: string;
};
type TextureSnapshotFn = (width: number, height: number, description?: string) => void;
type RenderTargetSnapshotFn = (x: number, y: number, width: number, height: number, description?: string) => void;

export type TextureDebuggerCallback = (
  texture: Texture,
  debug: { frame: number; elapsed: number; log: IDebug['log']; snapshot: TextureSnapshotFn }
) => void;
export type RenderTargetDebuggerCallback = (
  renderTarget: WebGLRenderTarget<Texture>,
  debug: { gl: WebGLRenderer; frame: number; elapsed: number; log: IDebug['log']; snapshot: RenderTargetSnapshotFn }
) => void;

class NoopDebug implements IDebug {
  onStartFrame() {}
  onEndFrame() {}
  log() {}
  expose() {}
  registerTextureDebugger() {
    return () => {};
  }
  registerRenderTargetDebugger() {
    return () => {};
  }
  subscribeInfo() {
    return () => {};
  }
  getInfo() {
    return new Map();
  }
  subscribeSnapshots() {
    return () => {};
  }
  getSnapshots() {
    return [];
  }
  isPaused = false;
}

class Debug extends EventTarget implements IDebug {
  #gl: WebGLRenderer | null = null;
  #frame = -1;
  #elapsed = 0;
  #logs = new Map<string, [value: string | number, frame: number]>();
  #exposedTextures = new Map<string, Texture>();
  #exposedRenderTargets = new Map<string, WebGLRenderTarget<Texture>>();
  #textureDebuggers = new Map<string, TextureDebuggerCallback[]>();
  #renderTargetDebuggers = new Map<string, RenderTargetDebuggerCallback[]>();
  #infoCache = new Map<string, [value: string | number, frameDiff: number]>();
  #snapshots: Snapshot[] = [];
  isPaused = false;

  #updateInfoCache() {
    const info = new Map<string, [value: string | number, frame: number]>();

    info.set('Frame', [this.#frame, 0]);
    info.set('Elapsed', [this.#elapsed, 0]);

    for (const [key, [value, frame]] of this.#logs) {
      info.set(key, [value, this.#frame - frame]);
    }

    this.#infoCache = info;
  }

  constructor() {
    super();
    this.subscribeInfo = this.subscribeInfo.bind(this);
    this.getInfo = this.getInfo.bind(this);
    this.subscribeSnapshots = this.subscribeSnapshots.bind(this);
    this.getSnapshots = this.getSnapshots.bind(this);
  }

  onStartFrame(gl: WebGLRenderer, elapsed: number) {
    this.#gl = gl;
    this.#frame++;
    this.#elapsed = elapsed;
    this.#exposedTextures.clear();
    this.#exposedRenderTargets.clear();
  }

  onEndFrame() {
    if (this.isPaused) return;

    if (this.#exposedTextures.size > 0) {
      for (const [key, texture] of this.#exposedTextures) {
        const snapshot: TextureSnapshotFn = (width, height, description) => {
          const data = new Float32Array(texture.image.data);

          this.#snapshots = [
            ...this.#snapshots,
            {
              key,
              frame: this.#frame,
              x: 0,
              y: 0,
              width,
              height,
              data,
              description,
            },
          ];
          this.dispatchEvent(new Event('snapshotsChange'));
        };

        this.#textureDebuggers.get(key)?.forEach((cb) =>
          cb(texture, {
            frame: this.#frame,
            elapsed: this.#elapsed,
            log: (logKey, value) => this.log(`T/${key}/${logKey}`, value),
            snapshot,
          })
        );
      }
    }

    if (this.#exposedRenderTargets.size > 0) {
      for (const [key, renderTarget] of this.#exposedRenderTargets) {
        const snapshot: RenderTargetSnapshotFn = (x, y, width, height, description) => {
          const data = new Float32Array(width * height * 4);

          this.#gl!.readRenderTargetPixels(renderTarget, x, y, width, height, data);

          this.#snapshots = [
            ...this.#snapshots,
            {
              key,
              frame: this.#frame,
              x,
              y,
              width,
              height,
              data,
              description,
            },
          ];
          this.dispatchEvent(new Event('snapshotsChange'));
        };

        this.#renderTargetDebuggers.get(key)?.forEach((cb) =>
          cb(renderTarget, {
            frame: this.#frame,
            elapsed: this.#elapsed,
            gl: this.#gl!,
            log: (logKey, value) => this.log(`T/${key}/${logKey}`, value),
            snapshot,
          })
        );
      }
    }

    this.#updateInfoCache();
    this.dispatchEvent(new Event('infoChange'));
  }

  log(key: string, value: string | number) {
    this.#logs.set(key, [value, this.#frame]);
  }

  expose(key: string, textureOrRenderTarget: Texture | WebGLRenderTarget<Texture>) {
    if (textureOrRenderTarget instanceof Texture) {
      this.#exposedTextures.set(key, textureOrRenderTarget);
    } else {
      this.#exposedRenderTargets.set(key, textureOrRenderTarget);
    }
  }

  registerTextureDebugger(key: string, callback: TextureDebuggerCallback) {
    this.#textureDebuggers.set(key, [...(this.#textureDebuggers.get(key) ?? []), callback]);

    return () => {
      this.#textureDebuggers.set(key, this.#textureDebuggers.get(key)?.filter((cb) => cb !== callback) ?? []);

      if (this.#textureDebuggers.get(key)?.length === 0) {
        this.#textureDebuggers.delete(key);
      }
    };
  }

  registerRenderTargetDebugger(key: string, callback: RenderTargetDebuggerCallback) {
    this.#renderTargetDebuggers.set(key, [...(this.#renderTargetDebuggers.get(key) ?? []), callback]);

    return () => {
      this.#renderTargetDebuggers.set(key, this.#renderTargetDebuggers.get(key)?.filter((cb) => cb !== callback) ?? []);

      if (this.#renderTargetDebuggers.get(key)?.length === 0) {
        this.#renderTargetDebuggers.delete(key);
      }
    };
  }

  subscribeInfo(onStoreChange: () => void) {
    this.addEventListener('infoChange', onStoreChange);

    return () => {
      this.removeEventListener('infoChange', onStoreChange);
    };
  }

  getInfo() {
    if (this.#infoCache.size === 0) {
      this.#updateInfoCache();
    }

    return this.#infoCache;
  }

  subscribeSnapshots(onStoreChange: () => void) {
    this.addEventListener('snapshotsChange', onStoreChange);

    return () => {
      this.removeEventListener('snapshotsChange', onStoreChange);
    };
  }

  getSnapshots() {
    return this.#snapshots;
  }
}

export const DebuggerContext = createContext<IDebug>(new NoopDebug());

type InfoProps = {
  isPaused: boolean;
};

const Info = ({ isPaused }: InfoProps) => {
  const debug = useContext(DebuggerContext);
  const state = useSyncExternalStore(debug.subscribeInfo, debug.getInfo);

  useEffect(() => {
    debug.isPaused = isPaused;
  }, [debug, isPaused]);

  return (
    <>
      {Array.from(state.entries()).map(([key, [value, frameDiff]]) => (
        <div key={key} style={{ opacity: 0.3 + (1 - Math.min(frameDiff, 60) / 60) * 0.7 }}>
          <strong>{key}</strong>: {typeof value === 'number' ? value.toFixed(4) : value}
        </div>
      ))}
    </>
  );
};

type DataPixelCellProps = {
  i: number;
  data: Float32Array;
};

function getStyleForValue(value: number) {
  const bg = new Vector3();

  if (value === -1) {
    bg.set(200, 64, 200);
  } else if (value === 0) {
    bg.set(128, 128, 128);
  } else if (value > 0) {
    bg.set(64, 128, 200);
  } else {
    bg.set(200, 128, 64);
  }

  const bgc = [...bg];

  return {
    backgroundColor: `rgba(${bgc[0]}, ${bgc[1]}, ${bgc[2]}, 0.75)`,
  };
}

const DataPixelCell = ({ i, data }: DataPixelCellProps) => {
  const pixelData = data.slice(i * 4, i * 4 + 4);

  return (
    <td className={classes.dataPixel}>
      <div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={getStyleForValue(pixelData[i])} data-value={pixelData[i]}>
            {pixelData[i].toFixed(0)}
          </div>
        ))}
      </div>
    </td>
  );
};

type SnapshotGridProps = {
  snapshot: Snapshot;
};

const SnapshotGrid = ({ snapshot: { width, height, data } }: SnapshotGridProps) => {
  const [value, setValue] = useState(0);

  function handleMouseOver(event: MouseEvent<HTMLTableElement>) {
    if (event.target instanceof HTMLDivElement && event.target.dataset.value) {
      setValue(parseFloat(event.target.dataset.value));
    }
  }

  return (
    <>
      <div className={classes.value}>
        <strong>Value:</strong>&nbsp;<span>{value}</span>
      </div>
      <table onMouseOver={handleMouseOver}>
        <tbody>
          <tr>
            <th>
              <sub>y</sub> <sup>x</sup>
            </th>
            {Array.from({ length: width }, (_, x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
          {Array.from({ length: height }, (_, y) => (
            <tr key={y}>
              <th>{y}</th>
              {Array.from({ length: width }, (_, x) => (
                <DataPixelCell key={x} i={y * width + x} data={data} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

type SnapshotsProps = {
  children: React.ReactNode;
};

const Snapshots = ({ children }: SnapshotsProps) => {
  const debug = useContext(DebuggerContext);
  const snapshots = useSyncExternalStore(debug.subscribeSnapshots, debug.getSnapshots);
  const [isUIShown, setIsUIShown] = useState(false);
  const [index, setIndex] = useState(0);
  const snapshot = snapshots[index];
  const { key, frame, x, y, width, height, description } = snapshot ?? {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUIShown(true);
  }

  return (
    <>
      {isUIShown && (
        <div className={classes.snapshots}>
          <div className={classes.toolbar}>
            <button onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
              &lt;
            </button>
            <button onClick={() => setIsUIShown(false)}>Close</button>
            <button onClick={() => setIndex((i) => i + 1)} disabled={index === snapshots.length - 1}>
              &gt;
            </button>
          </div>
          <div className={classes.info}>
            <strong>Key:</strong>
            <span>{key}</span>
            <strong>Frame:</strong>
            <span>{frame}</span>
            <strong>Offset:</strong>
            <span>
              {x}x{y}
            </span>
            <strong>Dimensions:</strong>
            <span>
              {width}x{height}
            </span>
            <strong>Description:</strong>
            <span>{description ?? 'N/A'}</span>
          </div>
          <SnapshotGrid snapshot={snapshot} />
        </div>
      )}
      <form onSubmit={handleSubmit} className={snapshots.length === 0 ? classes.hideSnapshotsButton : undefined}>
        {children}
      </form>
    </>
  );
};

const SnapshotsButton = () => {
  return <button type="submit">Show snapshots</button>;
};

export const Debugger = ({ isEnabled, children }: DebuggerProps) => {
  const debug = useMemo(() => (isEnabled ? new Debug() : new NoopDebug()), [isEnabled]);
  const [isPaused, setIsPaused] = useState(false);

  if (!isEnabled) return <>{children}</>;

  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    setIsPaused(true);
  }

  function handleMouseUp(event: MouseEvent) {
    event.stopPropagation();
    setIsPaused(false);
  }

  return (
    <DebuggerContext.Provider value={debug}>
      <Snapshots>
        <div className={classes.debugger} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
          <strong>
            Debugger <SnapshotsButton />
          </strong>
          <hr />
          <Info isPaused={isPaused} />
        </div>
      </Snapshots>
      {children}
    </DebuggerContext.Provider>
  );
};
