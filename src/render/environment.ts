import {
    Color,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    PMREMGenerator,
    Scene,
    type Texture,
    type WebGLRenderer,
} from 'three';
import { PALETTE } from './palette';

/** Build a small procedural neon-studio environment map so chrome parts reflect coloured light strips. */
export function createChromeEnvironment(renderer: WebGLRenderer): Texture {
    const studio = new Scene();
    studio.background = new Color(0x05030f);
    const strips: [number, number[], number[], number[]][] = [
        [PALETTE.cyan, [-6, 4, 0], [0, Math.PI / 2, 0], [1.5, 8, 1]],
        [PALETTE.magenta, [6, 4, 0], [0, -Math.PI / 2, 0], [1.5, 8, 1]],
        [PALETTE.gold, [0, 8, 0], [Math.PI / 2, 0, 0], [8, 3, 1]],
        [0xffffff, [0, 2, -7], [0, 0, 0], [10, 1, 1]],
    ];
    for (const [color, p, r, s] of strips) {
        const strip = new Mesh(new PlaneGeometry(s[0], s[1]), new MeshBasicMaterial({ color }));
        strip.position.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
        strip.rotation.set(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0);
        studio.add(strip);
    }
    const pmrem = new PMREMGenerator(renderer);
    const texture = pmrem.fromScene(studio, 0.02).texture;
    pmrem.dispose();
    return texture;
}
