"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Env = void 0;
const fs = require('fs');
const path = require('path');
class Env {
    static extractFromFile(envPath = path.resolve(process.cwd(), '.env')) {
        const rawEnvs = fs.readFileSync(envPath, { encoding: 'utf-8' });
        return new Map(rawEnvs.split('\n').map(i => i.split('=')));
    }
}
exports.Env = Env;
//# sourceMappingURL=Env.js.map