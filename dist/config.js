"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const APP_NAME = 'ossharu';
const LOCAL_CONFIG_FILENAME = `${APP_NAME}.config.json`;
const XDG_CONFIG_FILENAME = 'config.json';
function getXdgConfigDir() {
    const xdgConfigHome = process.env.XDG_CONFIG_HOME ||
        path.join(os.homedir(), '.config');
    return path.join(xdgConfigHome, APP_NAME);
}
function readConfigFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}
function readRawConfigFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}
function isProfiledConfig(raw) {
    return typeof raw === 'object' && raw !== null && 'profiles' in raw;
}
const REQUIRED_FIELDS = ['apiKey', 'region', 'voice', 'outputDir'];
function validateConfig(config) {
    for (const field of REQUIRED_FIELDS) {
        if (!config[field]) {
            throw new Error(`Config is invalid: ${field} is required but was not provided.`);
        }
    }
}
function findConfigInAncestors(dir) {
    const home = os.homedir();
    let current = dir;
    while (true) {
        const candidate = path.join(current, LOCAL_CONFIG_FILENAME);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        if (current === home) {
            return null;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            // reached filesystem root without finding home
            return null;
        }
        current = parent;
    }
}
function resolveFromXdgConfig(parsed, profileName, xdgConfigPath) {
    if (!isProfiledConfig(parsed)) {
        if (profileName !== undefined) {
            throw new Error(`--profile was specified but the XDG config at ${xdgConfigPath} uses the ` +
                `legacy single-config format. Migrate it to the profiles format to use --profile.`);
        }
        return parsed;
    }
    const profileNames = Object.keys(parsed.profiles);
    if (profileName !== undefined) {
        if (!(profileName in parsed.profiles)) {
            throw new Error(`Profile "${profileName}" not found in ${xdgConfigPath}. ` +
                `Available profiles: ${profileNames.join(', ')}`);
        }
        return parsed.profiles[profileName];
    }
    // No --profile given; figure out which profile to use automatically.
    //
    // Check defaultProfile first: if the user explicitly set it, always honour
    // and validate it — even when there happens to be only one profile.
    if (parsed.defaultProfile !== undefined) {
        if (!(parsed.defaultProfile in parsed.profiles)) {
            throw new Error(`defaultProfile "${parsed.defaultProfile}" in ${xdgConfigPath} does not match any profile. ` +
                `Available profiles: ${profileNames.join(', ')}`);
        }
        return parsed.profiles[parsed.defaultProfile];
    }
    if (profileNames.length === 1) {
        return parsed.profiles[profileNames[0]];
    }
    throw new Error(`Multiple profiles found in ${xdgConfigPath} but no --profile was specified ` +
        `and no defaultProfile is set. ` +
        `Available profiles: ${profileNames.join(', ')}. ` +
        `Pass --profile <name> or add a "defaultProfile" field to your config.`);
}
function loadConfig(options = {}) {
    let base = null;
    if (options.configFile) {
        base = readConfigFile(options.configFile);
    }
    else if (options.profile !== undefined) {
        // --profile: skip local ancestor walk entirely, go straight to XDG config.
        const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
        if (!fs.existsSync(xdgConfig)) {
            throw new Error(`--profile requires the XDG config file to exist at:\n  ${xdgConfig}`);
        }
        const parsed = readRawConfigFile(xdgConfig);
        base = resolveFromXdgConfig(parsed, options.profile, xdgConfig);
    }
    else {
        const cwdConfig = findConfigInAncestors(process.cwd());
        if (cwdConfig) {
            base = readConfigFile(cwdConfig);
        }
        else {
            const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
            if (fs.existsSync(xdgConfig)) {
                const parsed = readRawConfigFile(xdgConfig);
                base = resolveFromXdgConfig(parsed, undefined, xdgConfig);
            }
        }
    }
    if (!base) {
        const cwdConfig = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
        const xdgConfig = path.join(getXdgConfigDir(), XDG_CONFIG_FILENAME);
        throw new Error(`No config found. Provide --config, or place a config file at:\n` +
            `  ${cwdConfig}\n` +
            `  ${xdgConfig}`);
    }
    const merged = { ...base, ...options.overrides };
    validateConfig(merged);
    return merged;
}
//# sourceMappingURL=config.js.map