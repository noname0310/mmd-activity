// import copyWebpackPlugin from "copy-webpack-plugin";
import dotenv from "dotenv";
import eslintPlugin from "eslint-webpack-plugin";
import fs from "fs";
import htmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import type webpack from "webpack";
import { DefinePlugin } from "webpack";
import type { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";

if (fs.existsSync(path.join(__dirname, ".env"))) {
    dotenv.config({
        path: path.join(__dirname, ".env")
    });
}

export default (env: any): webpack.Configuration & { devServer?: WebpackDevServerConfiguration } => ({
    entry: "./src/index.ts",
    output: {
        path: path.join(__dirname, "/dist"),
        filename: "[name].bundle.js",
        clean: true
    },
    optimization: {
        minimize: env.production
    },
    cache: true,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                test: /\.html$/,
                loader: "html-loader"
            }
        ]
    },
    resolve: {
        alias: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "@": path.resolve(__dirname, "src")
        },
        modules: ["src", "node_modules"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        fallback: {
            "path": false,
            "fs": false
        }
    },
    plugins: [
        new htmlWebpackPlugin({
            template: "./src/index.html"
        }),
        new eslintPlugin({
            extensions: ["ts", "tsx"],
            fix: true,
            cache: true
        }),
        // new copyWebpackPlugin({
        //     patterns: [
        //         { from: "res", to: "res" }
        //     ]
        // })
        new DefinePlugin({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            DISCORD_CLIENT_ID: "\"" + process.env.DISCORD_CLIENT_ID + "\""
        })
    ],
    devServer: {
        host: "0.0.0.0",
        port: 20310,
        allowedHosts: "all",
        client: {
            logging: "none"
        },
        hot: true,
        watchFiles: ["src/**/*"],
        server: "http"
    },
    mode: env.production ? "production" : "development"
});
