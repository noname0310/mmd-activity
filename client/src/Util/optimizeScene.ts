import type { Scene } from "@babylonjs/core/scene";

export interface OptimizeSceneOptions {
    clearCachedVertexData?: boolean;
}

export function optimizeScene(scene: Scene, options: OptimizeSceneOptions = {}): void {
    const { clearCachedVertexData = true } = options;

    scene.freezeMaterials();

    const meshes = scene.meshes;
    for (let i = 0, len = meshes.length; i < len; ++i) {
        const mesh = meshes[i];
        mesh.freezeWorldMatrix();
        mesh.doNotSyncBoundingInfo = true;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
    }

    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;
    scene.skipFrustumClipping = true;
    scene.blockMaterialDirtyMechanism = true;
    if (clearCachedVertexData) scene.clearCachedVertexData();
    scene.cleanCachedTextureBuffer();
}
