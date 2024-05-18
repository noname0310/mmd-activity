import type { Packet } from "./packet";

export class Client {
    private readonly _socket: WebSocket;
    public onPacket: (packet: Packet) => void = () => {/* */};

    private constructor(url: string, onConnected?: () => void) {
        this._socket = new WebSocket(url);
        this._socket.onmessage = this._onMessage;

        this._socket.onclose = (): void => {
            console.log("Connection closed");
        };

        if (onConnected !== undefined) {
            this._socket.onopen = onConnected;
        }
    }

    public static async CreateAndConnect(url: string): Promise<Client> {
        return new Promise<Client>((resolve, _reject) => {
            const client = new Client(url, () => {
                resolve(client);
            });
        });
    }

    private readonly _onMessage = (event: MessageEvent): void => {
        const packet = JSON.parse(event.data) as Packet;
        this.onPacket(packet);
    };

    public send(packet: Packet): void {
        this._socket.send(JSON.stringify(packet));
    }

    public dispose(): void {
        this._socket.onmessage = null;
        this._socket.close();
    }

    public get isConnected(): boolean {
        return this._socket.readyState === WebSocket.OPEN;
    }
}
