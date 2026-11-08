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
    'dropBankCleared',
    'saucerCapture',
]);

/** Lamp that shows the saucer lock is lit. */
const LOCK_LAMP = 'lamp-saucer';

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
    private comboTimer = 0;
    private comboCount = 0;
    private tilted = false;
    private ballsInPlay = 1;
    private multiball = false;
    private locks = 0;
    private lockLit = false;
    private ejects: { id: string; ballId: number; timer: number }[] = [];
    private jackpots = 0;
    private superLit = false;
    private wizardTime = 0;
    private wizardWon = false;
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

    /** Current combo chain length (orbit/ramp shots within the combo window); 0 when none. */
    get combo(): number {
        return this.comboCount;
    }

    /** True while multiball is running. */
    get multiballActive(): boolean {
        return this.multiball;
    }

    /** Balls currently on the playfield (more than one only during multiball). */
    get ballsOnTable(): number {
        return this.ballsInPlay;
    }

    /** True when the ramp has lit the saucer lock. */
    get lockIsLit(): boolean {
        return this.lockLit;
    }

    /** Balls locked toward multiball so far this ball. */
    get lockedBalls(): number {
        return this.locks;
    }

    /** True when the next orbit exit collects the super jackpot. */
    get superJackpotLit(): boolean {
        return this.superLit;
    }

    /** True while wizard mode (unlocked by completing every mission) is running. */
    get wizardActive(): boolean {
        return this.wizardTime > 0;
    }

    /** True once wizard mode has been played to completion this game. */
    get wizardCompleted(): boolean {
        return this.wizardWon;
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
                if (this.ballsInPlay > 1) {
                    this.ballsInPlay -= 1;
                    if (this.ballsInPlay === 1) this.endMultiball(commands);
                    break;
                }
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
            case 'dropTargetHit':
                this.scorePlay(SCORING.dropTarget, SCORING.bonusDropTarget, 'target', commands);
                break;
            case 'dropBankCleared':
                this.dropBankCleared(commands);
                break;
            case 'saucerCapture':
                this.saucerCapture(event.id, event.ballId, commands);
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
        if (this.wizardTime > 0) {
            this.award(SCORING.wizardShot, out);
        } else if (!this.wizardWon && this.modes.allCompleted) {
            this.wizardTime = SCORING.wizardSeconds;
            this.saveTimer = 0;
            out.push({ type: 'display', text: 'WIZARD MODE' });
            out.push({ type: 'sound', name: 'wizardStart' });
        }
    }

    private endWizard(completed: boolean, out: RulesCommand[]): void {
        if (this.wizardTime <= 0) return;
        this.wizardTime = 0;
        if (completed) {
            this.wizardWon = true;
            this.award(SCORING.wizardAward, out);
            out.push({ type: 'display', text: 'WIZARD COMPLETE' });
            out.push({ type: 'sound', name: 'wizardComplete' });
        } else {
            out.push({ type: 'display', text: 'WIZARD OVER' });
        }
    }

    /** Award points and bonus for a playfield feature; ignored outside active play. */
    private scorePlay(points: number, bonus: number, sound: string, out: RulesCommand[]): void {
        if (this.currentPhase !== 'play' || this.tilted) return;
        this.award(points, out);
        this.bonus += bonus;
        out.push({ type: 'sound', name: sound });
    }

    /** Clearing a bank pays and advances the bonus multiplier. */
    private dropBankCleared(out: RulesCommand[]): void {
        if (this.currentPhase !== 'play' || this.tilted) return;
        this.scorePlay(SCORING.dropBank, SCORING.bonusDropBank, 'dropBank', out);
        this.multiplier = Math.min(SCORING.maxMultiplier, this.multiplier + 1);
        out.push({ type: 'display', text: `BONUS X${this.multiplier}` });
    }

    /** The saucer always ejects after a hold; a lit lock counts toward multiball. */
    private saucerCapture(id: string, ballId: number, out: RulesCommand[]): void {
        this.ejects.push({ id, ballId, timer: SCORING.saucerHoldSeconds });
        if (this.currentPhase !== 'play' || this.tilted) return;
        if (!this.lockLit || this.multiball) {
            this.scorePlay(SCORING.saucer, 0, 'saucer', out);
            return;
        }
        this.scorePlay(SCORING.lock, 0, 'lock', out);
        this.lockLit = false;
        out.push({ type: 'lamp', id: LOCK_LAMP, mode: 'off' });
        this.locks += 1;
        if (this.locks >= SCORING.locksForMultiball) {
            this.startMultiball(out);
        } else {
            out.push({ type: 'display', text: `BALL ${this.locks} LOCKED` });
        }
    }

    private pathShot(id: string, out: RulesCommand[]): void {
        const value = pathValue(id);
        if (!value) return;
        this.scorePlay(value.points, value.bonus, value.kind, out);
        if (this.currentPhase !== 'play' || this.tilted) return;
        this.comboShot(out);
        this.multiballShot(value.kind, out);
        if (value.kind !== 'ramp') return;
        this.rampShots += 1;
        if (this.rampShots % SCORING.rampsForExtraBall === 0) {
            this.extraBalls += 1;
            out.push({ type: 'display', text: 'EXTRA BALL' });
            out.push({ type: 'sound', name: 'extraBall' });
        }
    }

    /** Outside multiball the ramp lights the saucer lock; during multiball ramps pay jackpots and the orbit pays a lit super jackpot. */
    private multiballShot(kind: 'orbit' | 'ramp', out: RulesCommand[]): void {
        if (!this.multiball) {
            if (kind !== 'ramp' || this.lockLit) return;
            this.lockLit = true;
            out.push({ type: 'lamp', id: LOCK_LAMP, mode: 'flash' });
            out.push({ type: 'display', text: 'LOCK IS LIT' });
            return;
        }
        if (kind === 'ramp') {
            this.award(SCORING.jackpot, out);
            this.jackpots += 1;
            out.push({ type: 'display', text: 'JACKPOT' });
            out.push({ type: 'sound', name: 'jackpot' });
            if (this.jackpots % SCORING.jackpotsForSuper === 0 && !this.superLit) {
                this.superLit = true;
                out.push({ type: 'display', text: 'SUPER JACKPOT LIT' });
            }
        } else if (this.superLit) {
            this.superLit = false;
            this.award(SCORING.superJackpot, out);
            out.push({ type: 'display', text: 'SUPER JACKPOT' });
            out.push({ type: 'sound', name: 'superJackpot' });
        }
    }

    private startMultiball(out: RulesCommand[]): void {
        this.multiball = true;
        this.locks = 0;
        this.lockLit = false;
        out.push({ type: 'lamp', id: LOCK_LAMP, mode: 'off' });
        this.jackpots = 0;
        this.superLit = false;
        this.saveTimer = 0;
        const extra = SCORING.multiballBalls - this.ballsInPlay;
        for (let i = 0; i < extra; i++) out.push({ type: 'addBall' });
        this.ballsInPlay = SCORING.multiballBalls;
        out.push({ type: 'display', text: 'MULTIBALL' });
        out.push({ type: 'sound', name: 'multiball' });
    }

    private endMultiball(out: RulesCommand[]): void {
        this.multiball = false;
        this.superLit = false;
        this.jackpots = 0;
        out.push({ type: 'display', text: 'MULTIBALL OVER' });
    }

    /** Chain orbit/ramp exits: each one inside the window raises the combo and pays a growing bonus. */
    private comboShot(out: RulesCommand[]): void {
        this.comboCount = this.comboTimer > 0 ? this.comboCount + 1 : 1;
        this.comboTimer = SCORING.comboWindow;
        if (this.comboCount < 2) return;
        const level = Math.min(this.comboCount, SCORING.maxCombo);
        this.award((level - 1) * SCORING.comboStep, out);
        out.push({ type: 'display', text: `COMBO X${this.comboCount}` });
        out.push({ type: 'sound', name: 'combo' });
    }

    private startGame(out: RulesCommand[]): void {
        this.total = 0;
        this.ball = 0;
        this.extraBalls = 0;
        this.rampShots = 0;
        this.wizardTime = 0;
        this.wizardWon = false;
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
        this.comboTimer = 0;
        this.comboCount = 0;
        this.ballsInPlay = 1;
        this.multiball = false;
        this.locks = 0;
        this.lockLit = false;
        this.ejects = [];
        out.push({ type: 'lamp', id: LOCK_LAMP, mode: 'off' });
        this.jackpots = 0;
        this.superLit = false;
        this.currentPhase = 'plunger';
        out.push({ type: 'addBall' });
        out.push({ type: 'display', text: `BALL ${this.ball}` });
    }

    private startBonus(out: RulesCommand[]): void {
        this.modes.endBall(out);
        this.endWizard(false, out);
        this.currentPhase = 'bonus';
        this.timer = BONUS_COUNT_SECONDS;
        out.push({ type: 'display', text: `BONUS ${this.bonus} X${this.multiplier}` });
        out.push({ type: 'sound', name: 'drain' });
    }

    private advanceTimer(dt: number, out: RulesCommand[]): void {
        for (const eject of this.ejects) {
            eject.timer -= dt;
            if (eject.timer <= 0)
                out.push({ type: 'kickBall', id: eject.id, ballId: eject.ballId });
        }
        this.ejects = this.ejects.filter(e => e.timer > 0);
        if (this.currentPhase === 'play' && this.saveTimer > 0) {
            this.saveTimer = Math.max(0, this.saveTimer - dt);
        }
        if (this.currentPhase === 'play') {
            this.modes.advance(dt, out);
            if (this.wizardTime > 0) {
                if (this.wizardTime - dt <= 0) this.endWizard(true, out);
                else this.wizardTime -= dt;
            }
            if (this.comboTimer > 0) {
                this.comboTimer = Math.max(0, this.comboTimer - dt);
                if (this.comboTimer === 0) this.comboCount = 0;
            }
        }
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
