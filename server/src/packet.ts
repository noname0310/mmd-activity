export enum PacketKind {
    OnConnect = "OnConnect",
    Resume = "Resume",
    Pause = "Pause",
    Seek = "Seek",
    PlaybackRateChange = "PlaybackRateChange",
    OnResume = "OnResume",
    OnPause = "OnPause",
    OnSeek = "OnSeek",
    OnPlaybackRateChange = "OnPlaybackRateChange"
}

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
    cameraMotion: string | null;
    endFrame: number | null;
}

export interface PlayerState {
    playing: boolean;
    pausedPosition: number;
    playedTime: number;
    playbackRate: number;
}

export interface OnConnectPacket {
    kind: PacketKind.OnConnect;
    clientId: number;
    sceneData: MmdSceneData;
    playerState: PlayerState;
    isFirstClient: boolean;
}

interface ExactSyncPacket {
    position: number;
    requestTime: number;
}

export interface ResumePacket extends ExactSyncPacket {
    kind: PacketKind.Resume;
}

export interface PausePacket extends ExactSyncPacket {
    kind: PacketKind.Pause;
}

export interface SeekPacket extends ExactSyncPacket {
    kind: PacketKind.Seek;
}

export interface PlaybackRateChangePacket extends ExactSyncPacket {
    kind: PacketKind.PlaybackRateChange;
    rate: number;
}

interface OnSyncPacket extends ExactSyncPacket {
    clientId: number;
}

export interface OnResumePacket extends OnSyncPacket {
    kind: PacketKind.OnResume;
}

export interface OnPausePacket extends OnSyncPacket {
    kind: PacketKind.OnPause;
}

export interface OnSeekPacket extends OnSyncPacket {
    kind: PacketKind.OnSeek;
}

export interface OnPlaybackRateChangePacket extends OnSyncPacket {
    kind: PacketKind.OnPlaybackRateChange;
    rate: number;
}

export type Packet =
    | OnConnectPacket
    | ResumePacket
    | PausePacket
    | SeekPacket
    | PlaybackRateChangePacket
    | OnResumePacket
    | OnPausePacket
    | OnSeekPacket
    | OnPlaybackRateChangePacket;
