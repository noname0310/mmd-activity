import type WebSocket from "ws";

import type { OnConnectPacket, OnPausePacket, OnPlaybackRateChangePacket, OnResumePacket, OnSeekPacket, PlayerState } from "./packet";
import { PacketKind } from "./packet";
import { sceneData } from "./scene";
import { Server } from "./server";

async function main(): Promise<void> {
    const playerState: PlayerState = {
        playing: false,
        pausedPosition: 0,
        playedTime: 0,
        playbackRate: 1
    };

    const server = new Server(20311);

    const clientIdMap = new WeakMap<WebSocket, number>();
    let nextClientId = 0;

    server.onClientConnected = (socket): void => {
        const clientId = nextClientId;
        nextClientId += 1;
        clientIdMap.set(socket, clientId);

        const onConnectPacket: OnConnectPacket = {
            kind: PacketKind.OnConnect,
            clientId,
            sceneData,
            playerState,
            isFirstClient: server.connectedClients == 1
        };
        socket.send(JSON.stringify(onConnectPacket));
    };

    server.onPacket = (socket, packet): void => {
        console.log("received packet", packet);
        switch (packet.kind) {
        case PacketKind.Resume: {
            playerState.pausedPosition = packet.position;
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
            playerState.pausedPosition = packet.position;
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
            playerState.pausedPosition = packet.position;
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
            playerState.pausedPosition = packet.position;
            playerState.playedTime = packet.requestTime - (packet.position / 30 * 1000);
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
