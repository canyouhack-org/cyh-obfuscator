// Generic Obfuscator - For unsupported/unknown languages
// Works with common programming patterns
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class GenericObfuscator extends BaseObfuscator {
    constructor(options: ObfuscationOptions) {
        super(options);
    }

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Extract and protect strings first
        const strings: { original: string; placeholder: string; quote: string }[] = [];
        let strIdx = 0;

        // Extract triple-quoted strings (Python, Scala, etc.)
        result = result.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, (m) => {
            const ph = `___GENSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, quote: m.slice(0, 3) });
            strIdx++;
            return ph;
        });

        // Extract backtick strings (JavaScript, Go, etc.)
        result = result.replace(/`(?:[^`\\]|\\.)*`/g, (m) => {
            const ph = `___GENSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, quote: '`' });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___GENSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, quote: '"' });
            strIdx++;
            return ph;
        });

        // Extract single-quoted strings
        result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___GENSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, quote: "'" });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (try common patterns)
        if (this.options.removeComments) {
            // C-style multi-line comments /* ... */
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            // C-style single-line comments //
            result = result.replace(/\/\/[^\n]*/g, '');
            // Hash comments # (Python, Ruby, Shell, etc.)
            result = result.replace(/#[^\n]*/g, '');
            // SQL-style comments --
            result = result.replace(/--[^\n]*/g, '');
            // HTML comments <!-- ... -->
            result = result.replace(/<!--[\s\S]*?-->/g, '');
        }

        // Step 3: Rename variables (basic pattern matching)
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Restore strings with optional encoding
        for (const { original, placeholder, quote } of strings) {
            let replacement = original;

            // Only encode simple double/single quoted strings
            if (this.options.encodeStrings && (quote === '"' || quote === "'")) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 80 && !content.includes('$')) {
                    // Use Unicode escapes (widely compatible)
                    const encoded = content.split('').map(c => {
                        const code = c.charCodeAt(0);
                        return `\\u${code.toString(16).padStart(4, '0')}`;
                    }).join('');
                    replacement = `${quote}${encoded}${quote}`;
                }
            }

            result = result.split(placeholder).join(replacement);
        }

        // Step 5: Minify (compress whitespace)
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        // Common variable declaration patterns
        const patterns = [
            /\b(var|let|const|val|def|dim|local|my|our)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
            /\b(int|float|double|string|bool|boolean|char|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
        ];

        // Common reserved words (don't rename these)
        const reserved = new Set([
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
            'function', 'def', 'class', 'struct', 'enum', 'interface', 'trait', 'type',
            'import', 'export', 'from', 'require', 'include', 'use', 'package', 'module',
            'public', 'private', 'protected', 'static', 'final', 'const', 'var', 'let', 'val',
            'true', 'false', 'null', 'nil', 'none', 'undefined', 'void',
            'new', 'this', 'self', 'super', 'extends', 'implements', 'with',
            'try', 'catch', 'finally', 'throw', 'throws', 'raise', 'except',
            'async', 'await', 'yield', 'lambda', 'fn', 'proc', 'sub',
            'print', 'println', 'echo', 'console', 'log', 'write', 'read', 'input', 'output',
            'main', 'init', 'setup', 'run', 'start', 'stop', 'exit', 'quit',
            'and', 'or', 'not', 'in', 'is', 'as', 'typeof', 'instanceof'
        ]);

        const varMap = new Map<string, string>();

        // Find all variable declarations
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const name = match[2];
                if (name && !reserved.has(name.toLowerCase()) && !varMap.has(name) && name.length > 1) {
                    varMap.set(name, this.generateObfuscatedName());
                }
            }
        }

        // Replace all occurrences
        let result = code;
        varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });

        return result;
    }

    private generateObfuscatedName(): string {
        const chars = 'OoIl';
        const allChars = 'OoIl10';
        let name = chars[Math.floor(Math.random() * chars.length)];
        for (let i = 0; i < 5; i++) {
            name += allChars[Math.floor(Math.random() * allChars.length)];
        }
        this.counter++;
        return '_' + name + this.counter;
    }

    private minifyCode(code: string): string {
        // Conservative minification - only remove blank lines and trim
        return code.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join('\n');
    }
}
