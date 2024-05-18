import { Observable } from "@babylonjs/core/Misc/observable";
import { DiscordSDK } from "@discord/embedded-app-sdk";

import { Client } from "./client";
import { serverUrl } from "./constant";
import type { MmdSceneData, OnConnectPacket, Packet } from "./packet";
import { PacketKind } from "./packet";
import { SceneBuilder } from "./sceneBuilder";
import type { BaseRuntime } from "./Shared/baseRuntime";
import { loadSingleScene } from "./Shared/loadSingleScene";

await new Promise<void>(resolve => window.onload = (): void => resolve());

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
document.body.appendChild(canvas);

// eslint-disable-next-line @typescript-eslint/naming-convention
declare const DISCORD_CLIENT_ID: string;

let webSocketUrl = "ws://localhost:80";
async function initDiscordSdk(): Promise<void> {
    const queryParams = new URLSearchParams(window.location.search);
    const isEmbedded = queryParams.get("frame_id") !== null;
    let discordSdk: DiscordSDK;
    if (isEmbedded) {
        discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
        await discordSdk.ready();
        serverUrl.url = "server";
        webSocketUrl = `wss://${location.host}/server`;
    }
}

await initDiscordSdk();

const client = await Client.CreateAndConnect(webSocketUrl);

export interface SceneClient {
    readonly clientId: number;
    readonly onPacketObservable: Observable<Packet>;
    send(packet: Packet): void;
}
const onPacketObservable = new Observable<Packet>();

let runtime: Promise<BaseRuntime> | null = null;

function loadScene(packet: OnConnectPacket): void {
    function resolveSceneDataUrl(sceneData: MmdSceneData): void {
        sceneData.audio = serverUrl.url + sceneData.audio;
        for (const model of sceneData.models) {
            model.path = serverUrl.url + model.path;
            model.motionPaths = model.motionPaths.map(path => serverUrl.url + path);
        }
        if (sceneData.cameraMotion !== null) {
            sceneData.cameraMotion = serverUrl.url + sceneData.cameraMotion;
        }
    }
    resolveSceneDataUrl(packet.sceneData);

    const sceneClient: SceneClient = {
        clientId: packet.clientId,
        onPacketObservable,
        send: packet => client.send(packet)
    };

    if (runtime !== null) {
        const oldRuntime = runtime;
        runtime = new Promise<BaseRuntime>(resolve => {
            oldRuntime.then(runtime => {
                runtime.dispose();
                resolve(loadSingleScene(canvas, new SceneBuilder(packet, sceneClient)));
            });
        });
    } else {
        runtime = loadSingleScene(canvas, new SceneBuilder(packet, sceneClient));
    }
}

client.onPacket = (packet): void => {
    switch (packet.kind) {
    case PacketKind.OnConnect: {
        if (runtime !== null) {
            runtime;
        }
        loadScene(packet);
    }
    }

    onPacketObservable.notifyObservers(packet);
};
