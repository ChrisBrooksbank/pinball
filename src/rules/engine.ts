import type { RulesCommand, RulesEvent } from './types';

/** Points awarded per pop bumper hit (placeholder until the scoring task). */
const BUMPER_POINTS = 100;

/** Headless rules engine: feed it events, get back commands. No physics or rendering imports. */
export class RulesEngine {
    private total = 0;

    get score(): number {
        return this.total;
    }

    handle(event: RulesEvent): RulesCommand[] {
        const commands: RulesCommand[] = [];
        switch (event.type) {
            case 'bumperHit':
                this.award(BUMPER_POINTS, commands);
                commands.push({ type: 'sound', name: 'bumper' });
                break;
            default:
                break;
        }
        return commands;
    }

    private award(points: number, out: RulesCommand[]): void {
        this.total += points;
        out.push({ type: 'score', points, total: this.total });
    }
}
