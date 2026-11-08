import type { PhysicsEvent } from '@core/events';

/** Events from outside physics that drive the rules (UI, timers). */
export type GameInput =
    | { type: 'startPressed' }
    | { type: 'ballLaunched'; ballId: number }
    | { type: 'tick'; dt: number };

/** Everything the rules engine consumes: physics events plus game inputs. */
export type RulesEvent = PhysicsEvent | GameInput;

/** Commands emitted by the rules engine; main routes them to lamps, display, audio and physics. */
export type RulesCommand =
    | { type: 'lamp'; id: string; mode: 'on' | 'off' | 'flash' }
    | { type: 'score'; points: number; total: number }
    | { type: 'display'; text: string }
    | { type: 'sound'; name: string }
    | { type: 'kickBall'; id: string; ballId: number }
    | { type: 'addBall' };
