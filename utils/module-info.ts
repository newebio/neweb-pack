import Module = require("module");
import { dirname, join, sep } from "path";
export function getResolvedPath(modulePath: string, caller?: string) {
    return caller ? (Module as any)._resolveFilename(modulePath, {
        paths: (Module as any)._nodeModulePaths(dirname(caller)),
        filename: caller,
        id: caller,
    }) : (Module as any)._resolveFilename(modulePath);
}
export function getNearestPackageJSON(modulePath: string, caller?: string) {
    const splittedPath = getResolvedPath(modulePath, caller).split(sep);
    let i = 0;
    let packagePath;
    while (i < splittedPath.length) {
        splittedPath.pop();
        try {
            packagePath = join(splittedPath.join(sep), "package.json");
            require.resolve(packagePath);
            break;
        } catch (e) {
            packagePath = null;
        }
        i++;
    }
    return packagePath;
}
