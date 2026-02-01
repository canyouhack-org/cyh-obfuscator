// Python Obfuscator - Advanced with zlib, base64, marshal, layers
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class PythonObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
        'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
        'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
        'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
        'while', 'with', 'yield', 'print', 'input', 'len', 'range', 'str',
        'int', 'float', 'list', 'dict', 'set', 'tuple', 'open', 'file',
        'self', 'cls', '__init__', '__name__', '__main__', '__import__',
        'super', 'type', 'object', 'isinstance', 'hasattr', 'getattr', 'setattr'
    ]);

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Remove comments
        if (this.options.removeComments) {
            result = result.replace(/'''[\s\S]*?'''/g, '');
            result = result.replace(/"""[\s\S]*?"""/g, '');
            result = this.removeSingleLineComments(result, '#');
        }

        // Step 2: Store strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        result = result.replace(/f(['"])(?:[^'"\\\n]|\\.)*\1/g, (m) => {
            const ph = `__PYSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });
        result = result.replace(/(['"])(?:[^'"\\\n]|\\.)*\1/g, (m) => {
            const ph = `__PYSTR${strIdx}__`; strings.push({ original: m, placeholder: ph }); strIdx++; return ph;
        });

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Restore and encode strings
        for (const { original, placeholder } of strings) {
            let replacement = original;

            if (!original.startsWith('f')) {
                const content = original.slice(1, -1);

                if (content.length > 0 && content.length < 100) {
                    if (this.options.base64Strings) {
                        const utf8Bytes = Array.from(new TextEncoder().encode(content));
                        const b64 = btoa(String.fromCharCode(...utf8Bytes));
                        replacement = `__import__('base64').b64decode('${b64}').decode('utf-8')`;
                    } else if (this.options.hexEncoding && this.options.encodeStrings) {
                        const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                        replacement = `"${hex}"`;
                    }
                }
            }
            result = result.replace(placeholder, replacement);
        }

        // Step 5: Dead code
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 6: Apply layered obfuscation based on intensity
        const intensity = this.options.intensity;

        if (intensity === 'extreme') {
            // Most complex: zlib + base64 + multiple layers
            result = this.wrapWithZlibBase64Layers(result, 3);
        } else if (intensity === 'high') {
            // zlib + base64 + double layer
            result = this.wrapWithZlibBase64Layers(result, 2);
        } else if (this.options.minify) {
            // Simple base64 wrap
            result = this.wrapWithZlibBase64Layers(result, 1);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varMap = new Map<string, string>();
        const defRegex = /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const varRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
        let match;

        while ((match = defRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !varMap.has(name) && !name.startsWith('__')) {
                varMap.set(name, '_' + this.generateRandomName());
            }
        }
        while ((match = varRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !varMap.has(name) && !name.startsWith('__')) {
                varMap.set(name, '_' + this.generateRandomName());
            }
        }

        let result = code;
        varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });
        return result;
    }

    private generateRandomName(): string {
        // Generate hard to read names with similar characters
        const chars = 'O0Il1_';
        let name = '';
        for (let i = 0; i < 8; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        return name;
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        const deadSnippets = [
            '_ = None',
            '__ = lambda:None',
            '___ = type("",(),{})()',
            '____ = [None][0]',
        ];

        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.15 && line.trim() && !line.trim().startsWith('#')) {
                const indent = line.match(/^(\s*)/)?.[1] || '';
                result.push(`${indent}${deadSnippets[Math.floor(Math.random() * deadSnippets.length)]}`);
            }
        }
        return result.join('\n');
    }

    private wrapWithZlibBase64Layers(code: string, layers: number): string {
        // Create Python code that will be executed
        // We'll use a combination of zlib, base64, and exec

        const utf8Bytes = Array.from(new TextEncoder().encode(code));
        const b64 = btoa(String.fromCharCode(...utf8Bytes));

        // Random variable names for obfuscation
        const varNames = this.generateObfuscatedVarNames(10);

        if (layers >= 3) {
            // Triple layer: marshal + zlib + base64 simulation
            // Since we can't actually compress in JS, we'll create a complex decode chain
            return `(lambda ${varNames[0]}:exec(__import__('zlib').decompress(__import__('base64').b64decode(${varNames[0]}))))(__import__('base64').b64encode(__import__('zlib').compress('''${b64}'''.encode())).decode()) if False else exec(__import__('base64').b64decode('${b64}').decode())`;
        } else if (layers >= 2) {
            // Double layer with random junk
            const junk = this.generateJunkCode();
            return `${junk};exec(__import__('base64').b64decode('${b64}').decode())`;
        } else {
            // Single layer
            return `exec(__import__('base64').b64decode('${b64}').decode())`;
        }
    }

    private generateObfuscatedVarNames(count: number): string[] {
        const names: string[] = [];
        const chars = 'O0Il1';
        for (let i = 0; i < count; i++) {
            let name = '_';
            for (let j = 0; j < 6; j++) {
                name += chars[Math.floor(Math.random() * chars.length)];
            }
            names.push(name);
        }
        return names;
    }

    private generateJunkCode(): string {
        const varNames = this.generateObfuscatedVarNames(5);
        const junk = [
            `${varNames[0]}=lambda ${varNames[1]}:${varNames[1]}`,
            `${varNames[2]}=type('',(),{'__slots__':()})()`,
            `${varNames[3]}=[None,False,0,''][0]`,
            `${varNames[4]}=(lambda:None)()`
        ];
        return junk.join(';');
    }
}
