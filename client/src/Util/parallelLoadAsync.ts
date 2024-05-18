import type { ISceneLoaderProgressEvent } from "@babylonjs/core/Loading/sceneLoader";
import type { Scene } from "@babylonjs/core/scene";

type TaskFunction<R> = (updateProgress: (progress: ISceneLoaderProgressEvent) => void) => Promise<R>;
type Task<R> = readonly [string, TaskFunction<R>];
type LoadResult<T extends Task<any>[]> = {
    [K in keyof T]: T[K] extends Task<infer R> ? R : never;
};

export async function parallelLoadAsync<const T extends Task<any>[]>(
    scene: Scene,
    tasks: [...T]
): Promise<LoadResult<T>> {
    const engine = scene.getEngine();

    const babylonjsLoadingDiv = document.getElementById("babylonjsLoadingDiv");
    if (babylonjsLoadingDiv) babylonjsLoadingDiv.style.overflow = "hidden";

    const loadingTexts: string[] = new Array(tasks.length).fill("");
    const updateLoadingText = (updateIndex: number, text: string): void => {
        loadingTexts[updateIndex] = text;
        engine.loadingUIText = "<br/><br/><br/><br/>" + loadingTexts.join("<br/><br/>");
    };

    const promises: Promise<any>[] = [];
    for (const task of tasks) {
        const index = promises.length;
        const taskName = task[0];
        promises.push(
            task[1](event => {
                if (event.lengthComputable) {
                    updateLoadingText(index, `Loading ${taskName}... ${event.loaded}/${event.total} (${Math.floor(event.loaded * 100 / event.total)}%)`);
                } else {
                    updateLoadingText(index, `Loading ${taskName}... ${event.loaded}`);
                }
            })
        );
    }

    const loadResults = await Promise.all(promises);

    scene.onAfterRenderObservable.addOnce(() => setTimeout(() => {
        engine.hideLoadingUI();
    }, 0));

    return loadResults as any;
}
