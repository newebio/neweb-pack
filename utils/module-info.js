"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("module");
const path_1 = require("path");
function getResolvedPath(modulePath, caller) {
    return caller ? Module._resolveFilename(modulePath, {
        paths: Module._nodeModulePaths(path_1.dirname(caller)),
        filename: caller,
        id: caller,
    }) : Module._resolveFilename(modulePath);
}
exports.getResolvedPath = getResolvedPath;
function getNearestPackageJSON(modulePath, caller) {
    const splittedPath = getResolvedPath(modulePath, caller).split(path_1.sep);
    let i = 0;
    let packagePath;
    while (i < splittedPath.length) {
        splittedPath.pop();
        try {
            packagePath = path_1.join(splittedPath.join(path_1.sep), "package.json");
            require.resolve(packagePath);
            break;
        }
        catch (e) {
            packagePath = null;
        }
        i++;
    }
    return packagePath;
}
exports.getNearestPackageJSON = getNearestPackageJSON;
