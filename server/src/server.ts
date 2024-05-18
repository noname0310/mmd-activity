import cors from "cors";
import express from "express";
import type http from "http";
import WebSocket, { WebSocketServer } from "ws";

import type { Packet } from "./packet";

class Client {
    public readonly webSocket: Omit<WebSocket, "ping">;
    private _isAlive = true;

    public constructor(webSocket: WebSocket) {
        this.webSocket = webSocket;
        this.webSocket.on("pong", this._onPong);
    }

    public ping(): void {
        this._isAlive = false;
        (this.webSocket as WebSocket).ping();
    }

    private readonly _onPong = (): void => {
        this._isAlive = true;
    };

    public get isAlive(): boolean {
        return this._isAlive;
    }
}

export class Server {
    public onClientConnected: (socket: WebSocket) => void = () => {/* */};
    public onPacket: (socket: WebSocket, packet: Packet) => void = () => {/* */};
    private readonly _httpServer: http.Server;
    private readonly _websocketServer: WebSocketServer;
    private readonly _clients: Client[] = [];
    private readonly _pingInterval: NodeJS.Timeout;

    public constructor(port: number) {
        const app = express();

        app.use(cors({
            credentials: true,
            origin: "*"
        }));
        app.use("/", express.static("res"));

        this._httpServer = app.listen(port, () => {
            console.log(`server is listening on port ${port}`);
        }).on("error", (err) => {
            console.error(err);
        });

        this._websocketServer = new WebSocketServer({ server: this._httpServer });
        this._websocketServer.on("connection", this._onConnection);

        this._pingInterval = setInterval(() => {
            const clients = this._clients;
            for (let i = 0; i < clients.length; i++) {
                const client = clients[i];

                if (client.isAlive === false) {
                    client.webSocket.terminate();
                    clients.splice(i, 1);
                    i -= 1;
                    console.log("client terminated");
                    continue;
                }

                if (client.webSocket.readyState === WebSocket.OPEN) {
                    client.ping();
                }
            }
        }, 5000);
    }

    private readonly _onConnection = (client: WebSocket): void =>{
        console.log("client connected");

        const clientWrapper = new Client(client);
        clientWrapper.ping();

        this._clients.push(clientWrapper);

        const onMessage = (message: WebSocket.RawData): void => {
            this.onPacket(client, JSON.parse(message.toString()));
        };

        const onClose = (): void => {
            console.log("client disconnected");

            client.off("message", onMessage);
            client.off("close", onClose);

            const index = this._clients.indexOf(clientWrapper);
            if (index !== -1) this._clients.splice(index, 1);
        };

        client.on("message", onMessage);
        client.on("close", onClose);

        this.onClientConnected(client);
    };

    public async dispose(): Promise<void> {
        clearInterval(this._pingInterval);
        this._websocketServer.off("connection", this._onConnection);
        for (const client of this._clients) client.webSocket.terminate();

        await new Promise<void>((resolve, reject) => {
            this._websocketServer.close((err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve();
            });
        });

        await new Promise<void>((resolve, reject) => {
            this._httpServer.close((err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve();
            });
        });
    }

    public broadcast(packet: Packet): void {
        const stringifiedPacket = JSON.stringify(packet);
        this._websocketServer.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(stringifiedPacket);
            }
        });
    }
}
