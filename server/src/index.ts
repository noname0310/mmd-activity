import type WebSocket from "ws";

import type { MmdSceneData, OnConnectPacket, OnPausePacket, OnPlaybackRateChangePacket, OnResumePacket, OnSeekPacket, PlayerState } from "./packet";
import { PacketKind } from "./packet";
import { Server } from "./server";

const sceneData: MmdSceneData = {
    settings: {
        physics: true
    },
    audio: "/motion/daybreak_frontline.mp3",
    models: [
        {
            path: "/model/YYB Vintage Hatsune Miku.bpmx",
            motionPaths: [ "/motion/daybreak_frontline_a.bvmd" ],
            buildPhysics: true
        },
        {
            path: "/model/YYB Hatsune Miku_10th.bpmx",
            motionPaths: [ "/motion/daybreak_frontline_b.bvmd" ],
            buildPhysics: true
        }
    ],
    cameraMotion: "/motion/daybreak_frontline_camera.bvmd",
    endFrame: null
};

async function main(): Promise<void> {
    const playerState: PlayerState = {
        playing: false,
        playedTime: 0,
        playbackRate: 1
    };

    const server = new Server(20311);

    const clientIdMap = new WeakMap<WebSocket, number>();
    let nextClientId = 0;

    server.onClientConnected = (socket): void => {
        if (nextClientId === 0) {
            playerState.playing = true;
            playerState.playedTime = Date.now();
        }

        const clientId = nextClientId;
        nextClientId += 1;
        clientIdMap.set(socket, clientId);

        const onConnectPacket: OnConnectPacket = {
            kind: PacketKind.OnConnect,
            clientId,
            sceneData,
            playerState
        };
        socket.send(JSON.stringify(onConnectPacket));
    };

    server.onPacket = (socket, packet): void => {
        console.log("received packet", packet);
        switch (packet.kind) {
        case PacketKind.Resume: {
            playerState.playedTime = packet.requestTime - (packet.position / 30 * 1000);
            playerState.playing = true;
            const onResumePacket: OnResumePacket = {
                kind: PacketKind.OnResume,
                clientId: clientIdMap.get(socket)!,
                position: packet.position,
                requestTime: packet.requestTime
            };
            server.broadcast(onResumePacket);
            break;
        }
        case PacketKind.Pause: {
            playerState.playedTime = packet.requestTime - (packet.position / 30 * 1000);
            playerState.playing = false;
            const onPausePacket: OnPausePacket = {
                kind: PacketKind.OnPause,
                clientId: clientIdMap.get(socket)!,
                position: packet.position,
                requestTime: packet.requestTime
            };
            server.broadcast(onPausePacket);
            break;
        }
        case PacketKind.Seek: {
            playerState.playedTime = packet.requestTime - (packet.position / 30 * 1000);
            const seekPacket: OnSeekPacket = {
                kind: PacketKind.OnSeek,
                clientId: clientIdMap.get(socket)!,
                position: packet.position,
                requestTime: packet.requestTime
            };
            server.broadcast(seekPacket);
            break;
        }
        case PacketKind.PlaybackRateChange: {
            playerState.playbackRate = packet.rate;
            const playbackRateChangePacket: OnPlaybackRateChangePacket = {
                kind: PacketKind.OnPlaybackRateChange,
                clientId: clientIdMap.get(socket)!,
                position: packet.position,
                requestTime: packet.requestTime,
                rate: packet.rate
            };
            server.broadcast(playbackRateChangePacket);
            break;
        }
        }
    };

    process.on("SIGINT", async() => {
        console.log("shutting down");
        await server?.dispose();
        process.exit(1);
    });
}

main();
