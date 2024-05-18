import type { MmdSceneData } from "./packet";

export const sceneData: MmdSceneData = {
    settings: {
        physics: true
    },
    audio: "/motion/surges.mp3",
    models: [
        // {
        //     path: "/model/YYB Vintage Hatsune Miku.bpmx",
        //     motionPaths: [ "/motion/daybreak_frontline_a.bvmd" ],
        //     buildPhysics: true
        // },
        {
            path: "/model/YYB Hatsune Miku_10th.bpmx",
            motionPaths: [ "/motion/surges.bvmd" ],
            buildPhysics: true
        }
    ],
    cameraMotion: "/motion/surges.bvmd",
    endFrame: null
};
