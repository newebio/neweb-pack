"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function diffModules(modules, modules2) {
    return modules.filter((m) => !modules2.find((mod) => m.name === mod.name && m.type === mod.type && m.version === mod.version));
}
exports.default = diffModules;
