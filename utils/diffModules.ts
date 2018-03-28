import { IPackInfoModule } from "./../ModulePacker";

export default function diffModules(modules: IPackInfoModule[], modules2: IPackInfoModule[]) {
    return modules.filter((m) => !modules2.find((mod) =>
        m.name === mod.name && m.type === mod.type && m.version === mod.version));
}
