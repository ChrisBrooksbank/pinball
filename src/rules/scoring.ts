/** Scoring values (data). Tuned in one place so rules code stays free of magic numbers. */
export const SCORING = {
    bumper: 100,
    target: 500,
    spinner: 25,
    slingshot: 10,
    rollover: 100,
    rolloverRepeat: 25,
    /** Awarded when all three top rollovers (A-B-C) are lit; also raises the bonus multiplier. */
    rolloverComplete: 3000,
    bonusRollover: 25,
    inlane: 250,
    outlane: 1000,
    orbit: 1500,
    ramp: 3000,
    dropTarget: 300,
    /** Awarded when a drop-target bank is cleared (also raises the bonus multiplier). */
    dropBank: 2000,
    /** Kickout saucer hit while the lock is not lit. */
    saucer: 5000,
    /** Kickout saucer hit while the lock is lit. */
    lock: 10000,
    /** Bonus accrued per scoring feature, multiplied at the end of the ball. */
    bonusBumper: 50,
    bonusTarget: 250,
    bonusOrbit: 500,
    bonusRamp: 1000,
    bonusDropTarget: 100,
    bonusDropBank: 500,
    /** Target hits needed to raise the bonus multiplier by one. */
    targetsPerMultiplier: 3,
    maxMultiplier: 5,
    /** Ramp shots needed to light an extra ball. */
    rampsForExtraBall: 3,
    /** Seconds after an orbit/ramp exit in which the next one chains a combo. */
    comboWindow: 4,
    /** Extra points per combo level beyond the first shot (level 2 pays 1x, level 3 pays 2x...). */
    comboStep: 1000,
    /** Highest combo level that increases the payout. */
    maxCombo: 6,
    /** Ball locks in the saucer (lit by the ramp) needed to start multiball. */
    locksForMultiball: 2,
    /** Seconds the saucer holds a ball before the rules eject it. */
    saucerHoldSeconds: 1.5,
    /** Balls in play when multiball starts. */
    multiballBalls: 3,
    /** Ramp-shot jackpot during multiball. */
    jackpot: 20000,
    /** Jackpots collected before the super jackpot is lit on the orbit. */
    jackpotsForSuper: 3,
    superJackpot: 100000,
    /** Wizard mode: seconds it lasts, points per playfield shot, and the completion award. */
    wizardSeconds: 60,
    wizardShot: 5000,
    wizardAward: 250000,
} as const;

/** Points and bonus for a path exit, or null if the path is not a scoring shot. */
export function pathValue(
    id: string
): { points: number; bonus: number; kind: 'orbit' | 'ramp' } | null {
    if (id.startsWith('orbit')) {
        return { points: SCORING.orbit, bonus: SCORING.bonusOrbit, kind: 'orbit' };
    }
    if (id.startsWith('ramp')) {
        return { points: SCORING.ramp, bonus: SCORING.bonusRamp, kind: 'ramp' };
    }
    return null;
}
