import { Engine } from "@babylonjs/core/Engines/engine";

import type { ISceneBuilder } from "./baseRuntime";
import { BaseRuntime } from "./baseRuntime";

export async function loadSingleScene(canvas: HTMLCanvasElement, sceneBuilder: ISceneBuilder): Promise<BaseRuntime> {
    const engine = new Engine(canvas, false, {
        preserveDrawingBuffer: false,
        stencil: false,
        antialias: false,
        alpha: false,
        premultipliedAlpha: false,
        doNotHandleContextLost: true,
        doNotHandleTouchAction: false,
        audioEngine: false
    }, true);

    const baseRuntime = await BaseRuntime.Create({
        canvas,
        engine,
        sceneBuilder
    });
    baseRuntime.run();
    return baseRuntime;
}
