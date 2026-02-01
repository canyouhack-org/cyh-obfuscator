// Dart Obfuscator - Fixed string interpolation, comments, and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class DartObfuscator extends BaseObfuscator {
    private reserved = new Set([
        // Keywords
        'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class',
        'const', 'continue', 'covariant', 'default', 'deferred', 'do', 'dynamic', 'else',
        'enum', 'export', 'extends', 'extension', 'external', 'factory', 'false', 'final',
        'finally', 'for', 'Function', 'get', 'hide', 'if', 'implements', 'import', 'in',
        'interface', 'is', 'late', 'library', 'mixin', 'new', 'null', 'on', 'operator',
        'part', 'required', 'rethrow', 'return', 'set', 'show', 'static', 'super', 'switch',
        'sync', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield',
        // Built-in functions and types - NEVER RENAME
        'print', 'main', 'stdin', 'stdout', 'readLineSync', 'readLine', 'parse', 'tryParse',
        'String', 'int', 'double', 'bool', 'num', 'List', 'Map', 'Set', 'Object', 'Future', 'Stream',
        'toString', 'toInt', 'toDouble', 'length', 'isEmpty', 'isNotEmpty', 'first', 'last',
        'add', 'remove', 'contains', 'forEach', 'map', 'where', 'reduce', 'fold', 'any', 'every',
        'split', 'join', 'trim', 'substring', 'indexOf', 'replaceAll', 'toLowerCase', 'toUpperCase',
        'dart', 'io', 'convert', 'base64', 'utf8', 'args'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract strings FIRST to protect $var and ${expr} inside strings
        const strings: { original: string; placeholder: string; hasInterpolation: boolean }[] = [];
        let strIdx = 0;

        // Extract triple-quoted strings
        result = result.replace(/'''[\s\S]*?'''/g, (m) => {
            const ph = `___DARTSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, hasInterpolation: m.includes('$') });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___DARTSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, hasInterpolation: m.includes('$') });
            strIdx++;
            return ph;
        });

        // Extract single-quoted strings
        result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___DARTSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph, hasInterpolation: m.includes('$') });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            result = result.replace(/\/\/[^\n]*/g, '');
        }

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 5: Restore strings with interpolation variable renaming
        for (const { original, placeholder, hasInterpolation } of strings) {
            let replacement = original;

            if (hasInterpolation && this.options.renameVariables) {
                // Rename variables inside interpolation ${var} and $var
                replacement = replacement.replace(/\$\{([^}]+)\}/g, (match, expr) => {
                    let newExpr = expr;
                    this.varMap.forEach((newName, oldName) => {
                        newExpr = newExpr.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
                    });
                    return `\${${newExpr}}`;
                });
                replacement = replacement.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
                    const newName = this.varMap.get(varName);
                    return newName ? `$${newName}` : match;
                });
            } else if (!hasInterpolation && !original.startsWith("'''") && this.options.encodeStrings) {
                // Only encode simple strings (no interpolation)
                const quote = original[0];
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 80) {
                    const unicode = content.split('').map(c => {
                        return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
                    }).join('');
                    replacement = `${quote}${unicode}${quote}`;
                }
            }

            result = result.split(placeholder).join(replacement);
        }

        // Step 6: Minify (conservative approach)
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varRegex = /\b(var|final|const|int|double|String|bool|List|Map)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=;,)]/g;
        let match;

        while ((match = varRegex.exec(code)) !== null) {
            const name = match[2];
            if (!this.reserved.has(name) && !this.varMap.has(name) && name.length > 1) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }

        let result = code;
        this.varMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });
        return result;
    }

    private generateConfusingName(): string {
        const chars = 'OoIl1';
        let name = chars[Math.floor(Math.random() * chars.length)];
        for (let i = 0; i < 5; i++) {
            name += (chars + '0')[Math.floor(Math.random() * 6)];
        }
        return name;
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.1 && line.trim().endsWith(';')) {
                result.push('if(false){}');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Conservative: only remove blank lines, keep newlines
        return code.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(l => l.replace(/\s+/g, ' '))
            .join('\n');
    }
}
