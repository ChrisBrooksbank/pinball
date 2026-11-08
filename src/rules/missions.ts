import type { MissionDef } from './modes';

/** Mission 1: hit the target bank three times in a row, then pop the bumpers before time runs out. */
export const BUMPER_RUSH: MissionDef = {
    id: 'bumper-rush',
    name: 'BUMPER RUSH',
    qualify: ['target', 'target', 'target'],
    objective: { shot: 'bumper', count: 10 },
    timeLimit: 30,
    award: 25000,
};

/** Mission 2: loop the orbit, then the ramp, then spin the spinner hard before time runs out. */
export const SPIN_CYCLE: MissionDef = {
    id: 'spin-cycle',
    name: 'SPIN CYCLE',
    qualify: ['orbit', 'ramp'],
    objective: { shot: 'spinner', count: 20 },
    timeLimit: 40,
    award: 40000,
};

/** Mission 3: feed both inlanes, then slap the slingshots before time runs out. */
export const SLING_SHOT: MissionDef = {
    id: 'sling-shot',
    name: 'SLING SHOT',
    qualify: ['inlane', 'inlane'],
    objective: { shot: 'sling', count: 8 },
    timeLimit: 30,
    award: 60000,
};

/** Mission definitions (data). Missions are added here one at a time. */
export const MISSIONS: readonly MissionDef[] = [BUMPER_RUSH, SPIN_CYCLE, SLING_SHOT];
