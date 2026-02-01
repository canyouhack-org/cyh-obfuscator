// Ruby Obfuscator - Fixed string interpolation and safe minification
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class RubyObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'BEGIN', 'END', 'alias', 'and', 'begin', 'break', 'case', 'class', 'def',
        'defined?', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if',
        'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry',
        'return', 'self', 'super', 'then', 'true', 'undef', 'unless', 'until',
        'when', 'while', 'yield', 'puts', 'print', 'gets', 'require', 'require_relative',
        'attr_accessor', 'attr_reader', 'attr_writer', 'initialize', 'new',
        'each', 'map', 'select', 'reject', 'reduce', 'inject', 'collect', 'to_s', 'to_i', 'to_a',
        'chomp', 'strip', 'split', 'join', 'length', 'size', 'empty?', 'include?'
    ]);

    private varMap = new Map<string, string>();

    obfuscate(code: string): string {
        let result = code;
        this.varMap.clear();

        // Step 1: Extract ALL strings FIRST to protect # inside strings
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract single-quoted strings
        result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
            const ph = `___RBSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double-quoted strings (including those with interpolation)
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___RBSTR_${strIdx}_PLACEHOLDER___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments (now safe - strings are protected)
        // Only match # that is NOT part of a placeholder
        if (this.options.removeComments) {
            // Remove single-line comments - but be careful not to break code
            result = result.replace(/(?<![_a-zA-Z0-9])#(?!{)[^\n]*/g, '');
            // Remove multi-line comments
            result = result.replace(/=begin[\s\S]*?=end/g, '');
        }

        // Step 3: Rename variables
        if (this.options.renameVariables) {
            result = this.renameIdentifiers(result);
        }

        // Step 4: Dead code injection
        if (this.options.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Step 5: Minify
        if (this.options.minify || this.options.intensity === 'high' || this.options.intensity === 'extreme') {
            result = this.minifyCode(result);
        }

        // Step 6: Restore strings with optional encoding
        // Also rename variables inside string interpolation
        for (const { original, placeholder } of strings) {
            let replacement = original;
            const content = original.slice(1, -1);
            const hasInterpolation = original.includes('#{');

            if (hasInterpolation && this.options.renameVariables) {
                // Rename variables inside interpolation #{var}
                replacement = replacement.replace(/#\{([^}]+)\}/g, (match, expr) => {
                    let newExpr = expr;
                    this.varMap.forEach((newName, oldName) => {
                        newExpr = newExpr.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
                    });
                    return `#{${newExpr}}`;
                });
            } else if (!hasInterpolation && content.length > 0 && content.length < 100) {
                // Only encode if NO interpolation
                if (this.options.hexEncoding && this.options.encodeStrings) {
                    const hex = content.split('').map(c => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('');
                    replacement = `"${hex}"`;
                }
            }
            result = result.split(placeholder).join(replacement);
        }

        return result;
    }

    private renameIdentifiers(code: string): string {
        const varRegex = /\b([a-z_][a-zA-Z0-9_]*)\s*=/g;
        const defRegex = /\bdef\s+([a-z_][a-zA-Z0-9_?!]*)/g;
        let match;

        while ((match = defRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name)) {
                this.varMap.set(name, '_' + this.generateConfusingName());
            }
        }
        while ((match = varRegex.exec(code)) !== null) {
            const name = match[1];
            if (!this.reserved.has(name) && !this.varMap.has(name) && !name.startsWith('@')) {
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
        let insideMethod = false;

        for (const line of lines) {
            result.push(line);
            const trimmed = line.trim();

            if (trimmed.startsWith('def ')) insideMethod = true;
            if (trimmed === 'end' && insideMethod) insideMethod = false;

            if (!insideMethod) continue;

            const hasTerminator = /\b(return|break|next|raise)\b/.test(trimmed);
            if (Math.random() < 0.1 && trimmed && !hasTerminator) {
                result.push('_ = nil');
            }
        }
        return result.join('\n');
    }

    private minifyCode(code: string): string {
        // Remove blank lines and extra whitespace
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Join carefully - Ruby needs newlines or semicolons
        // Comments (full line or inline) need special handling
        const result: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\s+/g, ' ');
            const isFullLineComment = line.startsWith('#');
            // Check for inline comment (code followed by #, but not #{)
            const hasInlineComment = !isFullLineComment && /\s#(?!\{)/.test(line);
            const nextLine = lines[i + 1];
            const nextIsComment = nextLine && nextLine.trim().startsWith('#');

            if (isFullLineComment || hasInlineComment || nextIsComment) {
                // Lines with comments need newline separation
                result.push(line + '\n');
            } else if (i === lines.length - 1) {
                result.push(line);
            } else {
                result.push(line + ';');
            }
        }

        let finalResult = result.join('');

        // Fix keyword placement
        finalResult = finalResult.replace(/;(else|elsif|end|when|rescue|ensure|then|do)/g, ' $1');
        finalResult = finalResult.replace(/;+/g, ';');
        finalResult = finalResult.replace(/;\n/g, '\n');

        return finalResult.trim();
    }
}

