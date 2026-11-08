/** Scoring values (data). Tuned in one place so rules code stays free of magic numbers. */
export const SCORING = {
    bumper: 100,
    target: 500,
    spinner: 25,
    slingshot: 10,
    inlane: 250,
    outlane: 1000,
    orbit: 1500,
    ramp: 3000,
    /** Bonus accrued per scoring feature, multiplied at the end of the ball. */
    bonusBumper: 50,
    bonusTarget: 250,
    bonusOrbit: 500,
    bonusRamp: 1000,
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
