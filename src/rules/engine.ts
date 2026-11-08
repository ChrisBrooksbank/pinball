import type { RulesCommand, RulesEvent } from './types';

/** Points awarded per pop bumper hit (placeholder until the scoring task). */
const BUMPER_POINTS = 100;
/** Balls per game. */
const BALLS_PER_GAME = 3;
/** Bonus awarded per pop bumper hit made during a ball. */
const BONUS_PER_BUMPER = 50;
/** Seconds the bonus count is shown before the next ball or game over. */
const BONUS_COUNT_SECONDS = 2;
/** Seconds the game over screen is shown before returning to attract. */
const GAME_OVER_SECONDS = 3;

type GamePhase = 'attract' | 'plunger' | 'play' | 'bonus' | 'gameOver';

/** Headless rules engine: feed it events, get back commands. No physics or rendering imports. */
export class RulesEngine {
    private total = 0;
    private currentPhase: GamePhase = 'attract';
    private ball = 0;
    private bonus = 0;
    private timer = 0;

    get score(): number {
        return this.total;
    }

    get phase(): GamePhase {
        return this.currentPhase;
    }

    /** Current ball number (1-based); 0 when no game is running. */
    get ballNumber(): number {
        return this.ball;
    }

    handle(event: RulesEvent): RulesCommand[] {
        const commands: RulesCommand[] = [];
        switch (event.type) {
            case 'startPressed':
                if (this.currentPhase === 'attract') this.startGame(commands);
                break;
            case 'ballLaunched':
                if (this.currentPhase === 'plunger') {
                    this.currentPhase = 'play';
                    commands.push({ type: 'display', text: `BALL ${this.ball}` });
                }
                break;
            case 'drain':
                if (this.currentPhase === 'play') this.startBonus(commands);
                break;
            case 'tick':
                this.advanceTimer(event.dt, commands);
                break;
            case 'bumperHit':
                if (this.currentPhase === 'play') {
                    this.award(BUMPER_POINTS, commands);
                    this.bonus += BONUS_PER_BUMPER;
                    commands.push({ type: 'sound', name: 'bumper' });
                }
                break;
            default:
                break;
        }
        return commands;
    }

    private startGame(out: RulesCommand[]): void {
        this.total = 0;
        this.ball = 0;
        this.nextBall(out);
    }

    private nextBall(out: RulesCommand[]): void {
        this.ball += 1;
        this.bonus = 0;
        this.currentPhase = 'plunger';
        out.push({ type: 'addBall' });
        out.push({ type: 'display', text: `BALL ${this.ball}` });
    }

    private startBonus(out: RulesCommand[]): void {
        this.currentPhase = 'bonus';
        this.timer = BONUS_COUNT_SECONDS;
        out.push({ type: 'display', text: `BONUS ${this.bonus}` });
        out.push({ type: 'sound', name: 'drain' });
    }

    private advanceTimer(dt: number, out: RulesCommand[]): void {
        if (this.currentPhase !== 'bonus' && this.currentPhase !== 'gameOver') return;
        this.timer -= dt;
        if (this.timer > 0) return;
        if (this.currentPhase === 'bonus') {
            if (this.bonus > 0) this.award(this.bonus, out);
            this.bonus = 0;
            if (this.ball >= BALLS_PER_GAME) {
                this.currentPhase = 'gameOver';
                this.timer = GAME_OVER_SECONDS;
                out.push({ type: 'display', text: 'GAME OVER' });
            } else {
                this.nextBall(out);
            }
        } else {
            this.currentPhase = 'attract';
            this.ball = 0;
            out.push({ type: 'display', text: 'PRESS START' });
        }
    }

    private award(points: number, out: RulesCommand[]): void {
        this.total += points;
        out.push({ type: 'score', points, total: this.total });
    }
}
