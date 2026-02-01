// Groovy Obfuscator - Fixed string interpolation, comments, and minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class GroovyObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'abstract', 'as', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
        'class', 'const', 'continue', 'def', 'default', 'do', 'double', 'else', 'enum',
        'extends', 'false', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
        'import', 'in', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null',
        'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
        'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'trait', 'transient',
        'true', 'try', 'void', 'volatile', 'while', 'println', 'print', 'it'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract strings FIRST to protect ${} inside strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract triple-quoted strings (GStrings)
        result = result.replace(/"""[\s\S]*?"""/g, (m) => {
            const ph = `___GRSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract single-quoted strings (no interpolation)
        result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___GRSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings (has interpolation)
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___GRSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        if (this.options.removeComments) {
            // Remove multi-line comments /* ... */
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            // Remove single-line comments //
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

        // Step 5: Restore strings with interpolation variable renaming (BEFORE minify)
        for (const { original, placeholder } of strings) {
            let replacement = original;
            const hasInterpolation = original.startsWith('"') && /\$\{?[a-zA-Z_]/.test(original);

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
            } else if (!hasInterpolation && !original.startsWith('"""')) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 100) {
                    if (this.options.base64Strings) {
                        const utf8Bytes = Array.from(new TextEncoder().encode(content));
                        const b64 = btoa(String.fromCharCode(...utf8Bytes));
                        replacement = `new String(Base64.decoder.decode('${b64}'),'UTF-8')`;
                    } else if (this.options.hexEncoding && this.options.encodeStrings) {
                        const unicode = content.split('').map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
                        replacement = `"${unicode}"`;
                    }
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        // Step 6: Minify (AFTER string restoration)
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const defRegex = /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = defRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
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
        const chars = 'O0Il1_';
        let name = '';
        for (let i = 0; i < 8; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        return name + Math.random().toString(36).substr(2, 4);
    }

    private injectDeadCode(code: string): string {
        const lines = code.split('\n');
        const result: string[] = [];
        for (const line of lines) {
            result.push(line);
            if (Math.random() < 0.1 && (line.trim().endsWith(')') || line.trim().endsWith('{'))) {
                result.push('{}');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Remove blank lines and extra whitespace
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Join carefully with semicolons - Groovy needs them between statements
        const resultParts: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\s+/g, ' ');
            const isFullLineComment = line.startsWith('//');
            // Check for inline comment
            const hasInlineComment = !isFullLineComment && /\s\/\//.test(line);
            const nextLine = lines[i + 1];
            const nextIsComment = nextLine && nextLine.trim().startsWith('//');
            const endsWithBrace = line.endsWith('}') || line.endsWith('{');
            const endsWithSemicolon = line.endsWith(';');

            if (isFullLineComment || hasInlineComment || nextIsComment) {
                // Lines with comments need newline separation
                resultParts.push(line + '\n');
            } else if (endsWithBrace) {
                // Braces don't need semicolons
                resultParts.push(line + '\n');
            } else if (i === lines.length - 1) {
                resultParts.push(line);
            } else if (endsWithSemicolon) {
                // Already has semicolon
                resultParts.push(line + ' ');
            } else {
                // Add semicolon between statements
                resultParts.push(line + '; ');
            }
        }

        let result = resultParts.join('');

        // Clean up extra semicolons and spaces
        result = result.replace(/;\s*;/g, ';');
        result = result.replace(/;\s*}/g, '}');
        result = result.replace(/{\s*;/g, '{');
        result = result.replace(/;\s*\n/g, '\n');

        return result.trim();
    }
}
