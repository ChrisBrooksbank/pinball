import type { RulesCommand } from './types';

/** A mission as data: a qualifying shot sequence starts it, then an objective is raced against a timer. */
export interface MissionDef {
    id: string;
    name: string;
    /** Shot ids (prefix match) that must be hit in order to start the mission. */
    qualify: readonly string[];
    /** Objective: hit `count` shots whose id starts with `shot` before the timer runs out. */
    objective: { shot: string; count: number };
    /** Seconds allowed to finish the objective. */
    timeLimit: number;
    /** Points for completing the mission. */
    award: number;
}

interface ActiveMission {
    def: MissionDef;
    remaining: number;
    timeLeft: number;
}

/** Result of feeding the mode manager something; points are awarded by the engine. */
interface ModeResult {
    points: number;
}

/**
 * Mission framework: tracks qualify-sequence progress and completed missions across balls,
 * runs one timed mission at a time. Pure state; knows nothing about physics or rendering.
 */
export class ModeManager {
    private readonly qualifyIndex = new Map<string, number>();
    private readonly done = new Set<string>();
    private current: ActiveMission | null = null;

    constructor(private readonly missions: readonly MissionDef[]) {}

    /** Id of the running mission, or null. */
    get activeId(): string | null {
        return this.current?.def.id ?? null;
    }

    /** Seconds left on the running mission (0 when none). */
    get timeLeft(): number {
        return this.current?.timeLeft ?? 0;
    }

    /** Objective shots still needed for the running mission (0 when none). */
    get shotsRemaining(): number {
        return this.current?.remaining ?? 0;
    }

    /** True once every mission has been completed (and at least one exists). */
    get allCompleted(): boolean {
        return this.missions.length > 0 && this.done.size === this.missions.length;
    }

    isCompleted(id: string): boolean {
        return this.done.has(id);
    }

    /** Qualify-sequence progress (shots matched so far) for a mission. */
    qualifyProgress(id: string): number {
        return this.qualifyIndex.get(id) ?? 0;
    }

    /** New game: forget all progress. */
    reset(): void {
        this.qualifyIndex.clear();
        this.done.clear();
        this.current = null;
    }

    /** Ball ended: a running mission is abandoned, but qualify progress and completions persist. */
    endBall(out: RulesCommand[]): void {
        if (this.current) this.fail(out);
    }

    /** Feed a playfield shot id. Returns points earned. */
    shot(id: string, out: RulesCommand[]): ModeResult {
        if (this.current) return this.objectiveShot(id, out);
        this.advanceQualifiers(id, out);
        return { points: 0 };
    }

    advance(dt: number, out: RulesCommand[]): void {
        const active = this.current;
        if (!active) return;
        active.timeLeft -= dt;
        if (active.timeLeft <= 0) this.fail(out);
    }

    private objectiveShot(id: string, out: RulesCommand[]): ModeResult {
        const active = this.current;
        if (!active || !id.startsWith(active.def.objective.shot)) return { points: 0 };
        active.remaining -= 1;
        if (active.remaining > 0) {
            out.push({ type: 'sound', name: 'missionProgress' });
            return { points: 0 };
        }
        const { def } = active;
        this.current = null;
        this.done.add(def.id);
        this.qualifyIndex.set(def.id, 0);
        out.push({ type: 'lamp', id: lampId(def.id), mode: 'on' });
        out.push({ type: 'display', text: `${def.name} COMPLETE` });
        out.push({ type: 'sound', name: 'missionComplete' });
        return { points: def.award };
    }

    private advanceQualifiers(id: string, out: RulesCommand[]): void {
        for (const def of this.missions) {
            if (this.done.has(def.id)) continue;
            const index = this.qualifyIndex.get(def.id) ?? 0;
            let next = 0;
            if (matches(id, def.qualify[index])) next = index + 1;
            else if (matches(id, def.qualify[0])) next = 1;
            if (next >= def.qualify.length) {
                this.qualifyIndex.set(def.id, 0);
                this.start(def, out);
                return;
            }
            this.qualifyIndex.set(def.id, next);
        }
    }

    private start(def: MissionDef, out: RulesCommand[]): void {
        this.current = { def, remaining: def.objective.count, timeLeft: def.timeLimit };
        out.push({ type: 'lamp', id: lampId(def.id), mode: 'flash' });
        out.push({ type: 'display', text: `${def.name} START` });
        out.push({ type: 'sound', name: 'missionStart' });
    }

    private fail(out: RulesCommand[]): void {
        const active = this.current;
        if (!active) return;
        this.current = null;
        out.push({ type: 'lamp', id: lampId(active.def.id), mode: 'off' });
        out.push({ type: 'display', text: `${active.def.name} FAILED` });
        out.push({ type: 'sound', name: 'missionFail' });
    }
}

function matches(id: string, pattern: string | undefined): boolean {
    return pattern !== undefined && id.startsWith(pattern);
}

function lampId(missionId: string): string {
    return `mission-${missionId}`;
}
