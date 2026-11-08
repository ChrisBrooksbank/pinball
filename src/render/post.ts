import type { Camera, Scene, WebGLRenderer } from 'three';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BLOOM } from './palette';

interface PostProcessing {
    render(): void;
    setSize(width: number, height: number, pixelRatio: number): void;
}

/** Bloom post-processing chain: scene render, bloom on bright emissives, tone-mapped output. */
export function createPostProcessing(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera
): PostProcessing {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
        new UnrealBloomPass(new Vector2(1, 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold)
    );
    composer.addPass(new OutputPass());
    return {
        render: () => composer.render(),
        setSize: (width, height, pixelRatio) => {
            composer.setPixelRatio(pixelRatio);
            composer.setSize(width, height);
        },
    };
}
