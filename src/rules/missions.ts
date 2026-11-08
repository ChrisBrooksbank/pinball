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

/** Mission definitions (data). Missions are added here one at a time. */
export const MISSIONS: readonly MissionDef[] = [BUMPER_RUSH];
