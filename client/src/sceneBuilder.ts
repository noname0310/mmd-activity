import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Materials/Textures/Loaders/tgaTextureLoader";
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Loader/pmdLoader";
import "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import "babylon-mmd/esm/Runtime/Optimized/Animation/mmdWasmRuntimeModelAnimation";

import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { DepthOfFieldEffectBlurLevel } from "@babylonjs/core/PostProcesses/depthOfFieldEffect";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { Scene } from "@babylonjs/core/scene";
import type { Nullable } from "@babylonjs/core/types";
import { WaterMaterial } from "@babylonjs/materials/water/waterMaterial";
import type { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import type { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import type { BpmxLoader } from "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import { BvmdLoader } from "babylon-mmd/esm/Loader/Optimized/bvmdLoader";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { StreamAudioPlayer } from "babylon-mmd/esm/Runtime/Audio/streamAudioPlayer";
import type { IMmdModel } from "babylon-mmd/esm/Runtime/IMmdModel";
import { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import { MmdWasmAnimation } from "babylon-mmd/esm/Runtime/Optimized/Animation/mmdWasmAnimation";
import { MmdWasmInstanceTypeSR } from "babylon-mmd/esm/Runtime/Optimized/InstanceType/singleRelease";
import { getMmdWasmInstance } from "babylon-mmd/esm/Runtime/Optimized/mmdWasmInstance";
import { MmdWasmRuntime, MmdWasmRuntimeAnimationEvaluationType } from "babylon-mmd/esm/Runtime/Optimized/mmdWasmRuntime";
import { MmdAmmoJSPlugin } from "babylon-mmd/esm/Runtime/Physics/mmdAmmoJSPlugin";
import { MmdAmmoPhysics } from "babylon-mmd/esm/Runtime/Physics/mmdAmmoPhysics";
import { MmdPlayerControl } from "babylon-mmd/esm/Runtime/Util/mmdPlayerControl";

import ammo from "@/External/ammo.wasm";
import type { ISceneBuilder } from "@/Shared/baseRuntime";
import { createCameraSwitch } from "@/Util/createCameraSwitch";
import { createDefaultArcRotateCamera } from "@/Util/createDefaultArcRotateCamera";
import { MmdCameraAutoFocus2 } from "@/Util/mmdCameraAutoFocus2";
import { optimizeScene } from "@/Util/optimizeScene";

export interface MmdSceneData {
    settings: {
        physics: boolean;
    },
    audio: string;
    models: {
        path: string;
        motionPaths: string[];
        buildPhysics: boolean;
    }[],
    cameraMotion: Nullable<string>;
    endFrame: Nullable<number>;
}

export class SceneBuilder implements ISceneBuilder {
    private readonly _sceneData: MmdSceneData;

    public constructor(sceneData: MmdSceneData) {
        this._sceneData = sceneData;
    }

    public async build(canvas: HTMLCanvasElement, engine: AbstractEngine): Promise<Scene> {
        SdefInjector.OverrideEngineCreateEffect(engine);
        const bpmxLoader = SceneLoader.GetPluginForExtension(".bpmx") as BpmxLoader;
        bpmxLoader.loggingEnabled = true;
        const materialBuilder = bpmxLoader.materialBuilder as MmdStandardMaterialBuilder;
        materialBuilder.loadOutlineRenderingProperties = (): void => { /* do nothing */ };

        const scene = new Scene(engine);
        scene.ambientColor = new Color3(0.5, 0.5, 0.5);
        scene.clearColor = new Color4(0.95, 0.95, 0.95, 1.0);

        const mmdCamera = new MmdCamera("mmdCamera", new Vector3(0, 10, 0), scene);
        mmdCamera.maxZ = 5000;
        const camera = createDefaultArcRotateCamera(scene);
        createCameraSwitch(scene, canvas, mmdCamera, camera);

        const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
        hemisphericLight.intensity = 0.5;
        hemisphericLight.specular = new Color3(0, 0, 0);
        hemisphericLight.groundColor = new Color3(1, 1, 1);

        const directionalLight = new DirectionalLight("directionalLight", new Vector3(0.5, -1, 1), scene);
        directionalLight.intensity = 0.5;

        const shadowGenerator = new CascadedShadowGenerator(1024, directionalLight);
        shadowGenerator.transparencyShadow = true;
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.forceBackFacesOnly = false;
        shadowGenerator.lambda = 0.96;
        shadowGenerator.bias = 0.007;
        shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;

        const audioPlayer = new StreamAudioPlayer(scene);
        audioPlayer.preservesPitch = false;
        audioPlayer.source = this._sceneData.audio;

        const bvmdLoader = new BvmdLoader(scene);
        bvmdLoader.loggingEnabled = true;
        const vmdLoader = new VmdLoader(scene);
        vmdLoader.loggingEnabled = true;

        engine.displayLoadingUI();

        const loadTasks = [
            (async(): Promise<MmdAmmoJSPlugin> => {
                const physicsInstance = await ammo();
                const physicsPlugin = new MmdAmmoJSPlugin(true, physicsInstance);
                scene.enablePhysics(new Vector3(0, -9.8 * 10, 0), physicsPlugin);
                return physicsPlugin;
            })(),
            (async(): Promise<[MmdWasmRuntime, MmdWasmAnimation[]]> => {
                const wasmInstancePromise = getMmdWasmInstance(new MmdWasmInstanceTypeSR());
                const mmdAnimationsPromise: Promise<MmdAnimation>[] = [];

                const animationPathsList: string[][] = [];
                {
                    const models = this._sceneData.models;
                    const animationPathsSet = new Set<string>();
                    for (let i = 0; i < models.length; i++) {
                        const model = models[i];
                        const modelAnimationPaths = model.motionPaths;

                        const animationPathKey = modelAnimationPaths.join(",");
                        if (!animationPathsSet.has(animationPathKey)) {
                            animationPathsSet.add(animationPathKey);
                            animationPathsList.push(modelAnimationPaths);
                        }
                    }

                    const cameraAnimationPath = this._sceneData.cameraMotion;
                    if (cameraAnimationPath && !animationPathsSet.has(cameraAnimationPath)) {
                        animationPathsList.push([cameraAnimationPath]);
                    }
                }

                for (const animationPaths of animationPathsList) {
                    let isBvmd = false;
                    for (const animationPath of animationPaths) {
                        if (animationPath.endsWith(".bvmd")) {
                            isBvmd = true;
                            break;
                        }
                    }

                    if (isBvmd) {
                        if (1 < animationPaths.length) {
                            throw new Error("BVMD does not support multiple animations");
                        }

                        mmdAnimationsPromise.push(bvmdLoader.loadAsync(animationPaths[0], animationPaths[0]));
                    } else {
                        mmdAnimationsPromise.push(vmdLoader.loadAsync(animationPaths.join(","), animationPaths));
                    }
                }

                const [mmdWasmInstance, ...mmdAnimations] = await Promise.all([wasmInstancePromise, ...mmdAnimationsPromise]);

                const mmdWasmAnimations = mmdAnimations.map(mmdAnimation => new MmdWasmAnimation(mmdAnimation, mmdWasmInstance, scene));

                const mmdWasmRuntime = new MmdWasmRuntime(mmdWasmInstance, scene, this._sceneData.settings.physics ? new MmdAmmoPhysics(scene) : null);
                mmdWasmRuntime.loggingEnabled = true;
                mmdWasmRuntime.evaluationType = MmdWasmRuntimeAnimationEvaluationType.Immediate;

                if (this._sceneData.endFrame !== null) {
                    mmdWasmRuntime.setManualAnimationDuration(this._sceneData.endFrame);
                } else {
                    let maxEndFrame = 0;
                    for (const mmdAnimation of mmdAnimations) {
                        maxEndFrame = Math.max(maxEndFrame, mmdAnimation.endFrame);
                    }
                    mmdWasmRuntime.setManualAnimationDuration(maxEndFrame);
                }

                mmdWasmRuntime.setAudioPlayer(audioPlayer);

                const mmdPlayerControl = new MmdPlayerControl(scene, mmdWasmRuntime, audioPlayer);
                mmdPlayerControl.showPlayerControl();

                mmdWasmRuntime.register(scene);

                return [mmdWasmRuntime, mmdWasmAnimations];
            })(),
            (async(): Promise<MmdMesh[]> => {
                bpmxLoader.boundingBoxMargin = 60;
                const modelPromises: Promise<MmdMesh>[] = [];
                for (const model of this._sceneData.models) {
                    modelPromises.push(SceneLoader.ImportMeshAsync(
                        undefined,
                        "",
                        model.path,
                        scene
                    ).then(result => result.meshes[0] as MmdMesh));
                }
                return Promise.all(modelPromises);
            })(),
            (async(): Promise<Mesh> => {
                const skybox = CreateBox("skyBox", { size: 1000.0 }, scene);
                const skyboxMaterial = new StandardMaterial("skyBox", scene);
                skyboxMaterial.backFaceCulling = false;
                await new Promise<void>(resolve => {
                    skyboxMaterial.reflectionTexture = new CubeTexture("res/stage/beach/TropicalSunnyDay", scene, undefined, undefined, undefined, () => resolve());
                });
                skyboxMaterial.reflectionTexture!.coordinatesMode = Texture.SKYBOX_MODE;
                skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
                skyboxMaterial.specularColor = new Color3(0, 0, 0);
                skyboxMaterial.disableLighting = true;
                skybox.material = skyboxMaterial;
                return skybox;
            })(),
            (async(): Promise<Mesh> => {
                const groundMaterial = new StandardMaterial("groundMaterial", scene);
                await new Promise<void>(resolve => {
                    const groundTexture = new Texture("res/stage/beach/sand.jpg", scene, undefined, undefined, undefined, () => resolve());
                    groundTexture.vScale = groundTexture.uScale = 8.0;
                    groundMaterial.diffuseTexture = groundTexture;
                });

                const ground = CreateGround("ground", { width: 1024, height: 1024, subdivisions: 32, updatable: false}, scene);
                ground.position.y = 0;
                ground.material = groundMaterial;
                return ground;
            })(),
            (async(): Promise<WaterMaterial> => {
                const waterMesh = CreateGround("waterMesh", { width: 1024, height: 1024, subdivisions: 32, updatable: false}, scene);
                waterMesh.position.y = 0.01;
                const water = new WaterMaterial("water", scene, new Vector2(1024, 1024));
                water.backFaceCulling = true;
                await new Promise<void>(resolve => {
                    water.bumpTexture = new Texture("res/stage/beach/waterbump.png", scene, undefined, undefined, undefined, () => resolve());
                });
                water.windForce = -5;
                water.waveHeight = 0.1;
                water.bumpHeight = 0.05;
                water.waveLength = 0.1;
                water.colorBlendFactor = 0;
                waterMesh.material = water;
                return water;
            })()
        ] as const;

        const [
            _physicsPlugin,
            [mmdRuntime, mmdAnimations],
            modelMeshes,
            skybox,
            ground,
            water
        ] = await Promise.all(loadTasks);

        scene.onAfterRenderObservable.addOnce(() => setTimeout(() => engine.hideLoadingUI(), 0));

        const animationMap = new Map<string, MmdWasmAnimation>();
        for (const mmdAnimation of mmdAnimations) {
            animationMap.set(mmdAnimation.name, mmdAnimation);
        }

        mmdRuntime.setCamera(mmdCamera);
        if (this._sceneData.cameraMotion) {
            const cameraAnimation = animationMap.get(this._sceneData.cameraMotion);
            if (cameraAnimation !== undefined) {
                mmdCamera.addAnimation(cameraAnimation);
                mmdCamera.setAnimation(cameraAnimation.name);
            }
        }

        const mmdModels: IMmdModel[] = [];
        for (let i = 0; i < modelMeshes.length; i++) {
            const modelMesh = modelMeshes[i];

            for (const mesh of modelMesh.metadata.meshes) mesh.receiveShadows = true;
            shadowGenerator.addShadowCaster(modelMesh);

            const modelData = this._sceneData.models[i];

            const mmdModel = mmdRuntime.createMmdModel(modelMesh, {
                buildPhysics: modelData.buildPhysics
            });
            // (mmdRuntime as any)._needToInitializePhysicsModels.add(mmdModel);
            // (mmdRuntime as any)._needToInitializePhysicsModelsBuffer.add(mmdModel);

            const mmdAnimation = animationMap.get(modelData.motionPaths.join(","));
            if (mmdAnimation !== undefined) {
                mmdModel.addAnimation(mmdAnimation);
                mmdModel.setAnimation(mmdAnimation.name);
            }

            mmdModels.push(mmdModel);
        }

        await mmdRuntime.playAnimation();

        // ammo js physics initialization is buggy...
        setTimeout(() => {
            for (const mmdModel of mmdRuntime.models) {
                (mmdRuntime as any)._needToInitializePhysicsModels.add(mmdModel);
                // (mmdRuntime as any)._needToInitializePhysicsModelsBuffer.add(mmdModel);
            }
        }, 1);

        water.addToRenderList(skybox);
        water.addToRenderList(ground);
        for (const modelMesh of modelMeshes) {
            for (const mesh of modelMesh.metadata.meshes) water.addToRenderList(mesh);
        }

        scene.onAfterRenderObservable.addOnce(() => optimizeScene(scene, { clearCachedVertexData: false}));

        const defaultPipeline = new DefaultRenderingPipeline("default", true, scene);
        defaultPipeline.samples = 4;
        defaultPipeline.bloomEnabled = true;
        defaultPipeline.chromaticAberrationEnabled = true;
        defaultPipeline.chromaticAberration.aberrationAmount = 1;
        defaultPipeline.depthOfFieldEnabled = true;
        defaultPipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.High;
        defaultPipeline.fxaaEnabled = true;
        defaultPipeline.imageProcessingEnabled = true;
        defaultPipeline.imageProcessing.toneMappingEnabled = true;
        defaultPipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
        defaultPipeline.imageProcessing.vignetteWeight = 0.5;
        defaultPipeline.imageProcessing.vignetteStretch = 0.5;
        defaultPipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
        defaultPipeline.imageProcessing.vignetteEnabled = true;
        const mmdCameraAutoFocus = new MmdCameraAutoFocus2(mmdCamera, defaultPipeline);
        mmdCameraAutoFocus.setTargets(mmdModels);
        mmdCameraAutoFocus.register(scene);

        for (const depthRenderer of Object.values(scene._depthRenderer)) {
            depthRenderer.forceDepthWriteTransparentMeshes = true;
        }

        return scene;
    }
}
