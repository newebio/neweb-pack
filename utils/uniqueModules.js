"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function uniqueModules(modules) {
    const result = [];
    for (const mod of modules) {
        if (!result.find((m) => m.name === mod.name && m.type === mod.type && m.version === mod.version)) {
            result.push(mod);
        }
    }
    return result;
}
exports.default = uniqueModules;
