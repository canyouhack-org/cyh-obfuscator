// SQL Obfuscator - Fixed with better string handling and encoding
import { BaseObfuscator } from './base';
import type { ObfuscationOptions } from './types';

export class SqlObfuscator extends BaseObfuscator {
    private reserved = new Set([
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
        'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD',
        'COLUMN', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'JOIN',
        'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON', 'GROUP', 'BY', 'ORDER',
        'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS', 'NULL',
        'NOT', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN',
        'ELSE', 'END', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ASC', 'DESC',
        'IS', 'TRUE', 'FALSE', 'DEFAULT', 'CONSTRAINT', 'UNIQUE', 'CHECK',
        'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'DECLARE', 'CURSOR',
        'FETCH', 'IF', 'ELSE', 'WHILE', 'RETURN', 'EXEC', 'EXECUTE', 'PROCEDURE',
        'FUNCTION', 'TRIGGER', 'VIEW', 'DATABASE', 'SCHEMA', 'GRANT', 'REVOKE',
        'INT', 'VARCHAR', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'FLOAT', 'DECIMAL'
    ]);

    constructor(options: ObfuscationOptions) {
        super(options);
    }

    obfuscate(code: string): string {
        let result = code;

        // Step 1: Extract strings to protect them
        const strings: { original: string; placeholder: string }[] = [];
        let strIdx = 0;

        // Extract single-quoted strings
        result = result.replace(/'(?:[^'\\]|\\.|'')*'/g, (m) => {
            const ph = `___SQLSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Extract double-quoted identifiers (not all SQL dialects)
        result = result.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const ph = `___SQLSTR_${strIdx}___`;
            strings.push({ original: m, placeholder: ph });
            strIdx++;
            return ph;
        });

        // Step 2: Remove comments
        if (this.options.removeComments) {
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');  // /* ... */
            result = result.replace(/--[^\n]*/g, '');  // -- ...
            result = result.replace(/#[^\n]*/g, '');   // # ... (MySQL)
        }

        // Step 3: Rename table aliases and column aliases
        if (this.options.renameVariables) {
            result = this.renameAliases(result);
        }

        // Step 4: Randomize keyword case
        result = this.randomizeKeywordCase(result);

        // Step 5: Restore strings with optional encoding
        for (const { original, placeholder } of strings) {
            let replacement = original;

            if (this.options.encodeStrings && original.startsWith("'")) {
                const content = original.slice(1, -1);
                if (content.length > 0 && content.length < 50) {
                    // Convert to CONCAT(CHAR()) - works in most SQL dialects
                    const chars = content.split('').map(c => `CHAR(${c.charCodeAt(0)})`);
                    replacement = `CONCAT(${chars.join(',')})`;
                }
            }

            result = result.split(placeholder).join(replacement);
        }

        // Step 6: Add whitespace padding (obfuscation)
        if (this.options.intensity !== 'low') {
            result = this.addWhitespacePadding(result);
        }

        // Step 7: Minify (optional)
        if (this.options.minify) {
            result = this.minifySql(result);
        }

        return result;
    }

    private renameAliases(code: string): string {
        let result = code;

        // Find and rename table aliases: FROM table AS alias, FROM table alias
        const aliasRegex = /\b(FROM|JOIN)\s+(\w+)\s+(AS\s+)?(\w+)/gi;
        let match;

        while ((match = aliasRegex.exec(code)) !== null) {
            const alias = match[4];
            if (alias && !this.reserved.has(alias.toUpperCase()) && !this.variableMap.has(alias)) {
                this.variableMap.set(alias, this.generateObfuscatedName());
            }
        }

        // Replace aliases
        this.variableMap.forEach((newName, oldName) => {
            result = result.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
        });

        return result;
    }

    private randomizeKeywordCase(code: string): string {
        let result = code;

        this.reserved.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            result = result.replace(regex, () => {
                // Random case for each character
                return keyword.split('').map(c =>
                    Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()
                ).join('');
            });
        });

        return result;
    }

    private generateObfuscatedName(): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let name = chars[Math.floor(Math.random() * chars.length)];
        for (let i = 0; i < 3; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        this.counter++;
        return name + this.counter;
    }

    private addWhitespacePadding(code: string): string {
        return code
            .replace(/,/g, ' , ')
            .replace(/\(/g, ' ( ')
            .replace(/\)/g, ' ) ')
            .replace(/=/g, ' = ')
            .replace(/<>/g, ' <> ')
            .replace(/!=/g, ' != ')
            .replace(/</g, ' < ')
            .replace(/>/g, ' > ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private minifySql(code: string): string {
        return code
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ',')
            .replace(/\s*\(\s*/g, '(')
            .replace(/\s*\)\s*/g, ')')
            .replace(/\s*=\s*/g, '=')
            .trim();
    }
}
