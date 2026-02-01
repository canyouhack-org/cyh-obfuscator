// CSS Obfuscator - Works with HTML obfuscator for class/id renaming
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class CssObfuscator extends BaseObfuscator {
    constructor(options: ObfuscationOptions) {
        super(options);
    }

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Remove comments
        if (this.options.removeComments) {
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        }

        // Step 2: Rename class and ID selectors
        if (this.options.renameVariables) {
            result = this.renameSelectors(result);
        }

        // Step 3: Obfuscate colors (optional)
        if (this.options.encodeStrings) {
            result = this.obfuscateColors(result);
        }

        // Step 4: Minify
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCss(result);
        }

        // Step 5: Add junk rules for obfuscation
        if (this.options.deadCodeInjection && this.options.intensity !== 'low') {
            result = this.addJunkRules(result);
        }

        return result;
    }

    private renameSelectors(code: string): string {
        let result = code;

        // Find all class selectors
        const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
        let match;

        while ((match = classRegex.exec(code)) !== null) {
            const className = match[1];
            if (!this.variableMap.has(className)) {
                this.variableMap.set(className, this.generateObfuscatedName());
            }
        }

        // Find all ID selectors
        const idRegex = /#([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
        while ((match = idRegex.exec(code)) !== null) {
            const idName = match[1];
            if (!this.variableMap.has(idName)) {
                this.variableMap.set(idName, this.generateObfuscatedName());
            }
        }

        // Replace all selectors
        this.variableMap.forEach((newName, oldName) => {
            // Replace class selectors
            result = result.replace(new RegExp(`\\.${this.escapeRegex(oldName)}\\b`, 'g'), '.' + newName);
            // Replace ID selectors
            result = result.replace(new RegExp(`#${this.escapeRegex(oldName)}\\b`, 'g'), '#' + newName);
        });

        return result;
    }

    private obfuscateColors(code: string): string {
        // Convert named colors to hex
        const colorMap: Record<string, string> = {
            'white': '#fff', 'black': '#000', 'red': '#f00', 'green': '#0f0', 'blue': '#00f',
            'yellow': '#ff0', 'cyan': '#0ff', 'magenta': '#f0f', 'gray': '#808080', 'grey': '#808080',
            'orange': '#ffa500', 'purple': '#800080', 'pink': '#ffc0cb', 'brown': '#a52a2a',
            'silver': '#c0c0c0', 'gold': '#ffd700', 'navy': '#000080', 'teal': '#008080'
        };

        let result = code;
        for (const [name, hex] of Object.entries(colorMap)) {
            result = result.replace(new RegExp(`:\\s*${name}\\b`, 'gi'), `:${hex}`);
        }

        return result;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private generateObfuscatedName(): string {
        const chars = 'OoIl';
        const allChars = 'OoIl10';
        let name = chars[Math.floor(Math.random() * chars.length)];
        for (let i = 0; i < 5; i++) {
            name += allChars[Math.floor(Math.random() * allChars.length)];
        }
        this.counter++;
        return name + this.counter;
    }

    private minifyCss(code: string): string {
        return code
            .replace(/\s+/g, ' ')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/\s*,\s*/g, ',')
            .replace(/;}/g, '}')  // Remove last semicolon before }
            .trim();
    }

    private addJunkRules(code: string): string {
        const intensity = this.getIntensityMultiplier();
        const junkRules: string[] = [];
        const properties = [
            'display:none', 'visibility:hidden', 'opacity:0',
            'position:absolute', 'left:-9999px', 'width:0', 'height:0'
        ];

        for (let i = 0; i < intensity * 2; i++) {
            const className = this.generateObfuscatedName();
            const prop = properties[Math.floor(Math.random() * properties.length)];
            junkRules.push(`.${className}{${prop}}`);
        }

        return code + junkRules.join('');
    }

    // Export variable map for HTML sync
    getVariableMap(): Map<string, string> {
        return this.variableMap;
    }

    // Import variable map from HTML obfuscator
    setVariableMap(map: Map<string, string>): void {
        map.forEach((value, key) => {
            this.variableMap.set(key, value);
        });
    }
}
