import { IPackInfoModule } from "./../ModulePacker";

export default function uniqueModules(modules: IPackInfoModule[]) {
    const result: IPackInfoModule[] = [];
    for (const mod of modules) {
        if (!result.find((m) => m.name === mod.name && m.type === mod.type && m.version === mod.version)) {
            result.push(mod);
        }
    }
    return result;
}
