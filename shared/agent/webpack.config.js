"use strict";
const path = require("path");
const FileManagerWebpackPlugin = require("filemanager-webpack-plugin");

module.exports = function(env, argv) {
	env = env || {};

	const production = !!env.production;
	console.log("Production:", production);

	const plugins = [
		new FileManagerWebpackPlugin({
			onEnd: [
				{
					copy: [
						{
							source: "dist/*",
							// TODO: Use environment variable if exists
							destination: path.resolve(__dirname, "../vscode-codestream/dist/")
						}
					]
				}
			]
		})
	];

	return {
		entry: "./src/agent.ts",
		mode: production ? "production" : "development",
		target: "node",
		devtool: !production ? "eval-source-map" : undefined,
		output: {
			libraryTarget: "commonjs2",
			filename: "agent.js"
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: /node_modules/
				}
			]
		},
		plugins: plugins
	};
};
