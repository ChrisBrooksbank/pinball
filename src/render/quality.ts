interface RenderQuality {
    /** Renderer/composer pixel ratio. */
    readonly pixelRatio: number;
    /** Bloom buffer resolution as a fraction of the framebuffer (bloom is blurry, so lower is cheap). */
    readonly bloomScale: number;
    /** MSAA on the default framebuffer. */
    readonly antialias: boolean;
}

interface QualityInput {
    readonly devicePixelRatio: number;
    /** Touch-first device (phones/tablets), treated as the low-power tier. */
    readonly coarsePointer: boolean;
}

const MAX_PIXEL_RATIO_DESKTOP = 2;
const MAX_PIXEL_RATIO_MOBILE = 1.5;

/** Pick render quality: cap pixel ratio and shrink the bloom buffers on mobile. */
export function chooseRenderQuality({
    devicePixelRatio,
    coarsePointer,
}: QualityInput): RenderQuality {
    const cap = coarsePointer ? MAX_PIXEL_RATIO_MOBILE : MAX_PIXEL_RATIO_DESKTOP;
    return {
        pixelRatio: Math.max(1, Math.min(devicePixelRatio, cap)),
        bloomScale: coarsePointer ? 0.35 : 0.5,
        // Post-processing renders to offscreen targets, so MSAA on the canvas is wasted work.
        antialias: false,
    };
}
