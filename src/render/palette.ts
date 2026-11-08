/** Neon-on-dark colour palette shared by the table scene, environment map and post-processing. */
export const PALETTE = {
    playfield: 0x0b0620,
    chrome: 0xd8e4ee,
    cyan: 0x35f0ff,
    cyanGlow: 0x0f8a99,
    magenta: 0xff3da5,
    magentaGlow: 0xb01e6e,
    gold: 0xffd23d,
    goldGlow: 0x8a6b00,
} as const;

/** Bloom post-processing parameters (strength, radius, luminance threshold). */
export const BLOOM = { strength: 0.55, radius: 0.4, threshold: 0.7 } as const;
