"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
// import globby = require("globby");
const mkdirp = require("mkdirp");
const path_1 = require("path");
const util_1 = require("util");
const webpack = require("webpack");
const module_info_1 = require("./utils/module-info");
const uniqueModules_1 = require("./utils/uniqueModules");
class ModulePacker {
    constructor(config) {
        this.config = config;
        this.modules = [];
        this.excludedModules = [];
        this.webpackConfig = {};
        if (this.config.excludedModules) {
            this.excludedModules = this.config.excludedModules;
        }
        if (this.config.webpackConfig) {
            this.webpackConfig = this.config.webpackConfig;
        }
        this.localModulesPath = path_1.resolve(this.config.modulesPath + "/local");
        this.npmModulesPath = path_1.resolve(this.config.modulesPath + "/npm");
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield util_1.promisify(mkdirp)(this.localModulesPath);
            yield util_1.promisify(mkdirp)(this.npmModulesPath);
            //        let files = await globby(this.localModulesPath + "/**/neweb.json", { absolute: true });
            //       for (const file of files) {
            //          const newebJSON: IModule = require(file);
            //         this.modules.push(newebJSON);
            //    }
            //   files = await globby(this.nodeModulesPath + "/**/neweb.json", { absolute: true });
            //  for (const file of files) {
            //     const newebJSON: IModule = require(file);
            //    this.modules.push(newebJSON);
            // }
        });
    }
    addLocalPackage(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const localPath = require.resolve(entry.startsWith(".") ? this.config.appRoot + "/" + entry : entry);
            const moduleName = localPath
                .replace(path_1.resolve(this.config.appRoot) + path_1.sep, "")
                .replace(/\.js$/i, "")
                .replace(/\\/gi, "/");
            const version = (yield util_1.promisify(fs_1.stat)(localPath)).mtime.getTime().toString();
            const mainFile = this.localModulesPath + "/" + moduleName + "/" + version + "/index.js";
            let newebFile = this.localModulesPath + "/" + moduleName + "/" + version + "/neweb.json";
            const existingModuleInfo = this.modules.find((m) => m.type === "local" && m.name === moduleName && m.version === version);
            if (existingModuleInfo && (!this.config.disableCacheForLocalModules
                || existingModuleInfo.modules.length === 0)) {
                return existingModuleInfo;
            }
            if (yield util_1.promisify(fs_1.exists)(newebFile)) {
                const jsonModuleInfo = JSON.parse((yield util_1.promisify(fs_1.readFile)(newebFile)).toString());
                if (jsonModuleInfo.dependencies.length === 0 || !this.config.disableCacheForLocalModules) {
                    return {
                        name: jsonModuleInfo.name,
                        version: jsonModuleInfo.version,
                        type: "local",
                        modules: jsonModuleInfo.dependencies,
                    };
                }
            }
            let maxVersion = parseInt(version, 10);
            const info = { name: moduleName, version, modules: [], type: "local" };
            this.modules.push(info);
            return new Promise((resolve, reject) => {
                webpack(Object.assign({}, this.webpackConfig, { entry: localPath, output: {
                        path: path_1.dirname(mainFile),
                        filename: path_1.basename(mainFile),
                        libraryTarget: "commonjs2",
                    }, target: "node", mode: "production", externals: [(context, childModuleName, callback) => __awaiter(this, void 0, void 0, function* () {
                            if (!childModuleName.startsWith(".") && childModuleName !== localPath) {
                                if (this.excludedModules.indexOf(childModuleName) > -1) {
                                    callback(null, `the ` + `${this.config.REQUIRE_FUNC_NAME}("npm", "${childModuleName}")`);
                                    return;
                                }
                                const child = yield this.handleChildNodeModule(context, childModuleName);
                                info.modules.push({
                                    name: child.name,
                                    type: "npm",
                                    version: child.version,
                                });
                                child.modules.map((m) => info.modules.push(m));
                                callback(null, `the ` +
                                    `${this.config.REQUIRE_FUNC_NAME}("npm", "${child.name}", "${child.version}")`);
                                return;
                            }
                            if (childModuleName.startsWith(".") && childModuleName !== localPath) {
                                const depInfo = yield this.addLocalPackage(require.resolve(context + "/" + childModuleName));
                                info.modules.push({
                                    name: depInfo.name,
                                    version: depInfo.version,
                                    type: "local",
                                });
                                depInfo.modules.map((m) => info.modules.push(m));
                                maxVersion = Math.max(maxVersion, parseInt(depInfo.version, 10));
                                callback(null, `the ` +
                                    `${this.config.REQUIRE_FUNC_NAME}("local", "${depInfo.name}", "${depInfo.version}")`);
                                return;
                            }
                            callback();
                        })] })).run((err, stats) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (stats.hasErrors()) {
                        reject(stats.toString());
                        return;
                    }
                    if (info.version !== maxVersion.toString()) {
                        const newVersionFile = path_1.resolve(this.localModulesPath + "/" + moduleName + "/" + maxVersion + "/index.js");
                        newebFile = this.localModulesPath + "/" + moduleName + "/" + maxVersion + "/neweb.json";
                        yield util_1.promisify(mkdirp)(path_1.dirname(newVersionFile));
                        yield util_1.promisify(fs_1.copyFile)(mainFile, newVersionFile);
                    }
                    info.version = maxVersion.toString();
                    info.modules = uniqueModules_1.default(info.modules);
                    yield util_1.promisify(fs_1.writeFile)(newebFile, `{
                    "name": "${moduleName}",
                    "version": "${maxVersion}",
                    "type": "npm",
                    "dependencies": ${JSON.stringify(info.modules.map((mod) => ({ name: mod.name, type: mod.type, version: mod.version })))}
                }`);
                    resolve(info);
                }));
            });
        });
    }
    addNodePackage(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainFile = this.npmModulesPath + "/" + name + "/" + version + "/index.js";
            const newebFile = this.npmModulesPath + "/" + name + "/" + version + "/neweb.json";
            const existingModuleInfo = this.modules.find((m) => m.type === "npm" && m.name === name && m.version === version);
            if (existingModuleInfo) {
                return existingModuleInfo;
            }
            if (yield util_1.promisify(fs_1.exists)(newebFile)) {
                const jsonModuleInfo = JSON.parse((yield util_1.promisify(fs_1.readFile)(newebFile)).toString());
                return {
                    name: jsonModuleInfo.name,
                    version: jsonModuleInfo.version,
                    type: jsonModuleInfo.type,
                    modules: jsonModuleInfo.dependencies,
                };
            }
            const info = { name, version, modules: [], type: "npm" };
            this.modules.push(info);
            return new Promise((resolve, reject) => {
                webpack({
                    entry: name,
                    output: {
                        path: path_1.dirname(mainFile),
                        filename: path_1.basename(mainFile),
                        libraryTarget: "commonjs2",
                    },
                    target: "node",
                    mode: "production",
                    externals: [(context, childModuleName, callback) => __awaiter(this, void 0, void 0, function* () {
                            if (!childModuleName.startsWith(".") && childModuleName !== name) {
                                if (this.excludedModules.indexOf(childModuleName) > -1) {
                                    callback(null, `the ` + `${this.config.REQUIRE_FUNC_NAME}("npm", "${childModuleName}")`);
                                    return;
                                }
                                const child = yield this.handleChildNodeModule(context, childModuleName);
                                child.modules.map((m) => info.modules.push(m));
                                callback(null, `the ` +
                                    `${this.config.REQUIRE_FUNC_NAME}("npm","${child.name}", "${child.version}")`);
                                return;
                            }
                            callback();
                        })],
                }).run((err, stats) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (stats.hasErrors()) {
                        reject(stats.toString());
                        return;
                    }
                    info.modules = uniqueModules_1.default(info.modules);
                    yield util_1.promisify(fs_1.writeFile)(newebFile, `{
                    "name": "${name}",
                    "version": "${version}",
                    "type": "npm",
                    "dependencies": ${JSON.stringify(info.modules.map((mod) => ({ name: mod.name, type: mod.type, version: mod.version })))}
                }`);
                    resolve(info);
                }));
            });
        });
    }
    handleChildNodeModule(context, childModuleName) {
        return __awaiter(this, void 0, void 0, function* () {
            const tmpName = (+new Date()).toString() + "" + Math.round(Math.random() * 10000);
            const tmpFileName = context + "/" + tmpName + ".js";
            yield util_1.promisify(fs_1.writeFile)(tmpFileName, "");
            let packageJSONPath = module_info_1.getNearestPackageJSON(childModuleName, tmpFileName);
            if (!packageJSONPath) {
                if (["url", "path", "util"].indexOf(childModuleName) === -1) {
                    throw new Error("not found package.json for " + childModuleName + " in " + tmpFileName);
                }
                packageJSONPath = path_1.resolve(path_1.join(__dirname, "package.json"));
            }
            const packageJSON = JSON.parse((yield util_1.promisify(fs_1.readFile)(packageJSONPath)).toString());
            yield util_1.promisify(fs_1.unlink)(tmpFileName);
            const depInfo = yield this.addNodePackage(childModuleName, packageJSON.version);
            const modules = [{
                    name: childModuleName,
                    version: packageJSON.version,
                    type: "npm",
                }];
            depInfo.modules.map((m) => modules.push(m));
            return { name: childModuleName, modules, version: packageJSON.version };
        });
    }
}
exports.default = ModulePacker;
