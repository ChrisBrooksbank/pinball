import { MISSIONS } from './missions';
import { ModeManager, type MissionDef } from './modes';
import { pathValue, SCORING } from './scoring';
import type { RulesCommand, RulesEvent } from './types';

/** Balls per game. */
const BALLS_PER_GAME = 3;
/** Seconds the bonus count is shown before the next ball or game over. */
const BONUS_COUNT_SECONDS = 2;
/** Seconds the game over screen is shown before returning to attract. */
const GAME_OVER_SECONDS = 3;
/** Seconds after launch during which a drained ball is returned to the plunger lane. */
const BALL_SAVE_SECONDS = 10;

/** Physics events that count as shots for missions. */
const SHOT_EVENTS: ReadonlySet<string> = new Set([
    'bumperHit',
    'targetHit',
    'spinnerSpin',
    'slingshot',
    'laneEnter',
    'pathExit',
]);

type GamePhase = 'attract' | 'plunger' | 'play' | 'bonus' | 'gameOver';

/** Headless rules engine: feed it events, get back commands. No physics or rendering imports. */
export class RulesEngine {
    private total = 0;
    private currentPhase: GamePhase = 'attract';
    private ball = 0;
    private bonus = 0;
    private timer = 0;
    private multiplier = 1;
    private targetHits = 0;
    private rampShots = 0;
    private extraBalls = 0;
    private saveTimer = 0;
    private tilted = false;
    private readonly modes: ModeManager;

    constructor(missions: readonly MissionDef[] = MISSIONS) {
        this.modes = new ModeManager(missions);
    }

    /** Mission state (qualify progress, active mission, completions). */
    get missionState(): ModeManager {
        return this.modes;
    }

    /** True once the current ball has been tilted: scoring is disabled and bonus forfeited. */
    get isTilted(): boolean {
        return this.tilted;
    }

    /** True while a drained ball would be saved. */
    get ballSaveActive(): boolean {
        return this.saveTimer > 0;
    }

    get score(): number {
        return this.total;
    }

    /** Current end-of-ball bonus multiplier (1-based). */
    get bonusMultiplier(): number {
        return this.multiplier;
    }

    /** Extra balls awarded and not yet played. */
    get extraBallsPending(): number {
        return this.extraBalls;
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
        this.handleEvent(event, commands);
        if ('id' in event && SHOT_EVENTS.has(event.type)) this.modeShot(event.id, commands);
        return commands;
    }

    private handleEvent(event: RulesEvent, commands: RulesCommand[]): void {
        switch (event.type) {
            case 'startPressed':
                if (this.currentPhase === 'attract') this.startGame(commands);
                break;
            case 'ballLaunched':
                if (this.currentPhase === 'plunger') {
                    this.currentPhase = 'play';
                    this.saveTimer = BALL_SAVE_SECONDS;
                    commands.push({ type: 'display', text: `BALL ${this.ball}` });
                }
                break;
            case 'drain':
                if (this.currentPhase !== 'play') break;
                if (this.saveTimer > 0 && !this.tilted) {
                    this.saveTimer = 0;
                    this.currentPhase = 'plunger';
                    commands.push({ type: 'addBall' });
                    commands.push({ type: 'display', text: 'BALL SAVED' });
                    commands.push({ type: 'sound', name: 'ballSave' });
                } else {
                    this.startBonus(commands);
                }
                break;
            case 'tilt':
                if (this.currentPhase !== 'play' || this.tilted) break;
                this.tilted = true;
                this.bonus = 0;
                this.saveTimer = 0;
                commands.push({ type: 'display', text: 'TILT' });
                commands.push({ type: 'sound', name: 'tilt' });
                break;
            case 'tick':
                this.advanceTimer(event.dt, commands);
                break;
            case 'bumperHit':
                this.scorePlay(SCORING.bumper, SCORING.bonusBumper, 'bumper', commands);
                break;
            case 'targetHit':
                if (this.currentPhase !== 'play' || this.tilted) break;
                this.scorePlay(SCORING.target, SCORING.bonusTarget, 'target', commands);
                this.targetHits += 1;
                if (this.targetHits % SCORING.targetsPerMultiplier === 0) {
                    this.multiplier = Math.min(SCORING.maxMultiplier, this.multiplier + 1);
                    commands.push({ type: 'display', text: `BONUS X${this.multiplier}` });
                }
                break;
            case 'spinnerSpin':
                this.scorePlay(SCORING.spinner, 0, 'spinner', commands);
                break;
            case 'slingshot':
                this.scorePlay(SCORING.slingshot, 0, 'slingshot', commands);
                break;
            case 'laneEnter':
                if (event.id.startsWith('inlane')) {
                    this.scorePlay(SCORING.inlane, 0, 'lane', commands);
                } else if (event.id.startsWith('outlane')) {
                    this.scorePlay(SCORING.outlane, 0, 'lane', commands);
                }
                break;
            case 'pathExit':
                this.pathShot(event.id, commands);
                break;
            default:
                break;
        }
    }

    /** Feed a playfield shot to the mission framework; only counts during untilted play. */
    private modeShot(id: string, out: RulesCommand[]): void {
        if (this.currentPhase !== 'play' || this.tilted) return;
        const { points } = this.modes.shot(id, out);
        if (points > 0) this.award(points, out);
    }

    /** Award points and bonus for a playfield feature; ignored outside active play. */
    private scorePlay(points: number, bonus: number, sound: string, out: RulesCommand[]): void {
        if (this.currentPhase !== 'play' || this.tilted) return;
        this.award(points, out);
        this.bonus += bonus;
        out.push({ type: 'sound', name: sound });
    }

    private pathShot(id: string, out: RulesCommand[]): void {
        const value = pathValue(id);
        if (!value) return;
        this.scorePlay(value.points, value.bonus, value.kind, out);
        if (this.currentPhase !== 'play' || this.tilted || value.kind !== 'ramp') return;
        this.rampShots += 1;
        if (this.rampShots % SCORING.rampsForExtraBall === 0) {
            this.extraBalls += 1;
            out.push({ type: 'display', text: 'EXTRA BALL' });
            out.push({ type: 'sound', name: 'extraBall' });
        }
    }

    private startGame(out: RulesCommand[]): void {
        this.total = 0;
        this.ball = 0;
        this.extraBalls = 0;
        this.rampShots = 0;
        this.modes.reset();
        this.nextBall(out);
    }

    private nextBall(out: RulesCommand[]): void {
        this.ball += 1;
        this.beginBall(out);
    }

    private beginBall(out: RulesCommand[]): void {
        this.bonus = 0;
        this.multiplier = 1;
        this.targetHits = 0;
        this.tilted = false;
        this.saveTimer = 0;
        this.currentPhase = 'plunger';
        out.push({ type: 'addBall' });
        out.push({ type: 'display', text: `BALL ${this.ball}` });
    }

    private startBonus(out: RulesCommand[]): void {
        this.modes.endBall(out);
        this.currentPhase = 'bonus';
        this.timer = BONUS_COUNT_SECONDS;
        out.push({ type: 'display', text: `BONUS ${this.bonus} X${this.multiplier}` });
        out.push({ type: 'sound', name: 'drain' });
    }

    private advanceTimer(dt: number, out: RulesCommand[]): void {
        if (this.currentPhase === 'play' && this.saveTimer > 0) {
            this.saveTimer = Math.max(0, this.saveTimer - dt);
        }
        if (this.currentPhase === 'play') this.modes.advance(dt, out);
        if (this.currentPhase !== 'bonus' && this.currentPhase !== 'gameOver') return;
        this.timer -= dt;
        if (this.timer > 0) return;
        if (this.currentPhase === 'bonus') {
            if (this.bonus > 0) this.award(this.bonus * this.multiplier, out);
            this.bonus = 0;
            if (this.extraBalls > 0) {
                this.extraBalls -= 1;
                this.beginBall(out);
            } else if (this.ball >= BALLS_PER_GAME) {
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
