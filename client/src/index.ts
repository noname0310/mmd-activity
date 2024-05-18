import { SceneBuilder } from "./sceneBuilder";
import { loadSingleScene } from "./Shared/loadSingleScene";

await new Promise<void>(resolve => window.onload = (): void => resolve());

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
document.body.appendChild(canvas);

await loadSingleScene(canvas, new SceneBuilder({
    settings: {
        physics: true
    },
    audio: "res/motion/daybreak_frontline.mp3",
    models: [
        {
            path: "res/model/YYB Vintage Hatsune Miku.bpmx",
            motionPaths: [ "res/motion/daybreak_frontline_a.bvmd" ],
            buildPhysics: true
        },
        {
            path: "res/model/YYB Hatsune Miku_10th.bpmx",
            motionPaths: [ "res/motion/daybreak_frontline_b.bvmd" ],
            buildPhysics: true
        }
    ],
    cameraMotion: "res/motion/daybreak_frontline_camera.bvmd",
    endFrame: null
}));
