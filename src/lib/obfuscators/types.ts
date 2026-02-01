// Types and interfaces for the obfuscation engine

export interface ObfuscationOptions {
  renameVariables: boolean;
  encodeStrings: boolean;
  removeComments: boolean;
  controlFlowFlattening: boolean;
  deadCodeInjection: boolean;
  unicodeEscape: boolean;
  hexEncoding: boolean;
  base64Strings: boolean;
  shuffleCode: boolean;
  minify: boolean;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
}

export const defaultOptions: ObfuscationOptions = {
  renameVariables: true,
  encodeStrings: true,
  removeComments: true,
  controlFlowFlattening: true,
  deadCodeInjection: true,
  unicodeEscape: true,
  hexEncoding: true,
  base64Strings: false,
  shuffleCode: true,
  minify: false,
  intensity: 'high',
};

export const presets = {
  quick: { ...defaultOptions, encodeStrings: false, controlFlowFlattening: false, deadCodeInjection: false, unicodeEscape: false, hexEncoding: false, shuffleCode: false, minify: true, intensity: 'low' as const },
  strong: { ...defaultOptions },
  maximum: { ...defaultOptions, base64Strings: true, minify: true, intensity: 'extreme' as const },
};

export type SupportedLanguage =
  | 'javascript' | 'python' | 'java' | 'cpp' | 'csharp' | 'go' | 'php' | 'ruby' | 'rust'
  | 'powershell' | 'bash' | 'lua' | 'perl' | 'scala' | 'dart' | 'groovy'
  | 'sql' | 'html' | 'css' | 'generic';

export interface LanguageInfo {
  id: SupportedLanguage;
  name: string;
  extension: string;
  category: 'popular' | 'scripting' | 'systems' | 'web' | 'other';
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  // Popular
  { id: 'javascript', name: 'JavaScript', extension: '.js', category: 'popular' },
  { id: 'python', name: 'Python', extension: '.py', category: 'popular' },
  { id: 'java', name: 'Java', extension: '.java', category: 'popular' },
  { id: 'csharp', name: 'C#', extension: '.cs', category: 'popular' },
  { id: 'cpp', name: 'C/C++', extension: '.cpp', category: 'popular' },
  { id: 'go', name: 'Go', extension: '.go', category: 'popular' },

  // Scripting
  { id: 'php', name: 'PHP', extension: '.php', category: 'scripting' },
  { id: 'ruby', name: 'Ruby', extension: '.rb', category: 'scripting' },
  { id: 'perl', name: 'Perl', extension: '.pl', category: 'scripting' },
  { id: 'lua', name: 'Lua', extension: '.lua', category: 'scripting' },
  { id: 'powershell', name: 'PowerShell', extension: '.ps1', category: 'scripting' },
  { id: 'bash', name: 'Bash/Shell', extension: '.sh', category: 'scripting' },
  { id: 'groovy', name: 'Groovy', extension: '.groovy', category: 'scripting' },

  // Systems
  { id: 'rust', name: 'Rust', extension: '.rs', category: 'systems' },
  { id: 'scala', name: 'Scala', extension: '.scala', category: 'systems' },
  { id: 'dart', name: 'Dart', extension: '.dart', category: 'systems' },

  // Web
  { id: 'html', name: 'HTML', extension: '.html', category: 'web' },
  { id: 'css', name: 'CSS', extension: '.css', category: 'web' },
  { id: 'sql', name: 'SQL', extension: '.sql', category: 'web' },

  // Other
  { id: 'generic', name: 'Other', extension: '.txt', category: 'other' },
];

export const LANGUAGE_CATEGORIES = [
  { id: 'popular', name: 'Popular' },
  { id: 'scripting', name: 'Scripting' },
  { id: 'systems', name: 'Systems' },
  { id: 'web', name: 'Web' },
  { id: 'other', name: 'Other' },
];
