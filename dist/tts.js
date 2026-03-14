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
exports.synthesizeSpeech = synthesizeSpeech;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MAX_TEXT_IN_FILENAME = 30;
async function synthesizeSpeech(options) {
    const { text, voice, speed, outputDir, synthesizer, force } = options;
    const slug = text.slice(0, MAX_TEXT_IN_FILENAME).replace(/[/\\?%*:|"<>]/g, '-');
    const existingFile = fs.readdirSync(outputDir)
        .find(f => f.startsWith(slug) && f.endsWith('.mp3'));
    if (existingFile && !force) {
        return path.join(outputDir, existingFile);
    }
    const audioData = await synthesizer({ text, voice, speed });
    const outputPath = existingFile
        ? path.join(outputDir, existingFile)
        : path.join(outputDir, `${slug}-${Date.now()}.mp3`);
    fs.writeFileSync(outputPath, audioData);
    return outputPath;
}
//# sourceMappingURL=tts.js.map