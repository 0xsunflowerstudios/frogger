import { OFFLINE_FARM } from "features/game/lib/landData";
import { GameState } from "features/game/types/game";
import { assign, createMachine, Interpreter, State } from "xstate";
import { loadPortal } from "../actions/loadPortal";
import { CONFIG } from "lib/config";
import { claimArcadeToken } from "../actions/claimArcadeToken";
import { PortalName } from "features/game/types/portals";
import { Client, Room } from "colyseus.js";
import { PlazaRoomState } from "features/world/types/Room";
import { SPAWNS } from "features/world/lib/spawn";
import { decodeToken } from "features/auth/actions/login";

const getJWT = () => {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg0NjAzZDMyNjYzNGZCNjRGQjAxZGU3MkRCMUI4NkJmRDBkNDFENjFjIiwidXNlckFjY2VzcyI6eyJ2ZXJpZmllZCI6dHJ1ZSwiY3JlYXRlRmFybSI6dHJ1ZSwibWludENvbGxlY3RpYmxlIjp0cnVlLCJzeW5jIjp0cnVlLCJ3aXRoZHJhdyI6dHJ1ZX0sImZhcm1JZCI6NDQsInBvcnRhbElkIjoiZnJvZ2dlciIsImlhdCI6MTcwMzIxOTAyNywiZXhwIjoxNzA1ODExMDI3fQ.85VHPsFtrhEKYcF20monSZfnzU20YOV3igfbsO6AODo";
  const code = new URLSearchParams(window.location.search).get("jwt");

  return code;
};

const getServer = () => {
  const code = new URLSearchParams(window.location.search).get("server");

  return code;
};

export interface Context {
  id: number;
  jwt: string;
  state: GameState;
  mmoServer?: Room<PlazaRoomState>;
}

export type PortalEvent =
  | { type: "START" }
  | { type: "CLAIM" }
  | { type: "RETRY" }
  | { type: "CONTINUE" };

export type PortalState = {
  value:
    | "initialising"
    | "error"
    | "idle"
    | "ready"
    | "unauthorised"
    | "loading"
    | "claiming"
    | "completed"
    | "rules";
  context: Context;
};

export type MachineInterpreter = Interpreter<
  Context,
  any,
  PortalEvent,
  PortalState
>;

export type PortalMachineState = State<Context, PortalEvent, PortalState>;

export const portalMachine = createMachine({
  id: "portalMachine",
  initial: "initialising",
  context: {
    id: 0,
    jwt: getJWT(),
    state: CONFIG.API_URL ? undefined : OFFLINE_FARM,

    completeAcknowledged: false,
  },
  states: {
    initialising: {
      always: [
        {
          target: "unauthorised",
          // TODO: Also validate token
          cond: (context) => !!CONFIG.API_URL && !context.jwt,
        },
        {
          target: "loading",
        },
      ],
    },
    introduction: {
      always: [
        {
          target: "completed",
          cond: (c) => {
            const todayKey = new Date().toISOString().slice(0, 10);

            const portals = (c.state?.portals ??
              {}) as Required<GameState>["portals"];

            const portal = portals[CONFIG.PORTAL_APP as PortalName];

            const alreadyMintedToday =
              portal?.history[todayKey]?.arcadeTokensMinted ?? 0;

            return alreadyMintedToday > 0;
          },
        },
        {
          target: "ready",
        },
      ],
    },

    loading: {
      id: "loading",
      invoke: {
        src: async (context) => {
          if (!CONFIG.API_URL) {
            return { game: OFFLINE_FARM };
          }

          const { farmId } = decodeToken(context.jwt as string);

          // Load the game data
          const { game } = await loadPortal({
            portalId: CONFIG.PORTAL_APP,
            token: context.jwt as string,
          });

          // Join the MMO Server
          let mmoServer: Room<PlazaRoomState> | undefined;
          const serverName = getServer() ?? "sunflorea_bliss";
          const mmoUrl = CONFIG.ROOM_URL;

          if (serverName && mmoUrl) {
            const client = new Client(mmoUrl);

            mmoServer = await client?.joinOrCreate<PlazaRoomState>(serverName, {
              jwt: context.jwt,
              bumpkin: game?.bumpkin,
              farmId,
              x: SPAWNS.frogger.default.x,
              y: SPAWNS.frogger.default.y,
              sceneId: "frogger",
              experience: game.bumpkin?.experience ?? 0,
            });
          }

          return { game, mmoServer, farmId };
        },
        onDone: [
          {
            target: "introduction",
            actions: assign({
              state: (_: any, event) => event.data.game,
              mmoServer: (_: any, event) => event.data.mmoServer,
              id: (_: any, event) => event.data.farmId,
            }),
          },
        ],
        onError: {
          target: "error",
        },
      },
    },

    rules: {
      on: {
        CONTINUE: {
          target: "introduction",
        },
      },
    },

    ready: {
      on: {
        CLAIM: {
          target: "claiming",
        },
      },
    },
    claiming: {
      id: "claiming",
      invoke: {
        src: async (context) => {
          const { game } = await claimArcadeToken({
            token: context.jwt as string,
          });

          return { game };
        },
        onDone: [
          {
            target: "completed",
            actions: assign({
              state: (_: any, event) => event.data.game,
            }),
          },
        ],
        onError: [
          {
            target: "error",
          },
        ],
      },
    },

    completed: {
      on: {
        CONTINUE: {
          target: "ready",
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "initialising",
        },
      },
    },
    unauthorised: {},
  },
});
