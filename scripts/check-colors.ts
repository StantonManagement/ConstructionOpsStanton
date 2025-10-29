#!/usr/bin/env node

/**
 * Color Validation Script
 * Scans the codebase for hardcoded Tailwind colors and reports violations
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Hardcoded color patterns to detect
const HARDCODED_COLOR_PATTERNS = [
  // Background colors
  /bg-(blue|gray|red|green|yellow|amber|emerald|indigo|purple|pink|rose|orange|teal|cyan|sky|violet|fuchsia|lime|stone|zinc|neutral|slate)-[0-9]+/g,
  // Text colors
  /text-(blue|gray|red|green|yellow|amber|emerald|indigo|purple|pink|rose|orange|teal|cyan|sky|violet|fuchsia|lime|stone|zinc|neutral|slate)-[0-9]+/g,
  // Border colors
  /border-(blue|gray|red|green|yellow|amber|emerald|indigo|purple|pink|rose|orange|teal|cyan|sky|violet|fuchsia|lime|stone|zinc|neutral|slate)-[0-9]+/g,
  // Ring colors
  /ring-(blue|gray|red|green|yellow|amber|emerald|indigo|purple|pink|rose|orange|teal|cyan|sky|violet|fuchsia|lime|stone|zinc|neutral|slate)-[0-9]+/g,
];

// Allowed exceptions (e.g., logos, specific UI elements)
const ALLOWED_EXCEPTIONS = [
  'text-yellow-400', // Star ratings
  'bg-gradient-to-br', // Gradients
  'from-blue-50', // Gradient from colors
  'to-indigo-50', // Gradient to colors
];

// Semantic color mappings
const SEMANTIC_MAPPINGS = {
  'bg-blue-600': 'bg-primary',
  'bg-blue-700': 'bg-primary/90',
  'bg-gray-100': 'bg-secondary',
  'bg-gray-200': 'bg-secondary/80',
  'bg-white': 'bg-card',
  'text-gray-900': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
};

interface Violation {
  file: string;
  line: number;
  content: string;
  suggestion: string;
}

class ColorValidator {
  private violations: Violation[] = [];
  private fileCount = 0;
  private totalLines = 0;

  scanDirectory(dir: string): void {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', '.next', 'dist', 'build'].includes(entry)) {
          this.scanDirectory(fullPath);
        }
      } else if (this.isRelevantFile(entry)) {
        this.scanFile(fullPath);
      }
    }
  }

  private isRelevantFile(filename: string): boolean {
    const ext = extname(filename);
    return ['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext);
  }

  private scanFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      this.fileCount++;
      this.totalLines += lines.length;

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        for (const pattern of HARDCODED_COLOR_PATTERNS) {
          const matches = line.match(pattern);
          if (matches) {
            for (const match of matches) {
              // Check if it's an allowed exception
              if (!ALLOWED_EXCEPTIONS.some(exception => match.includes(exception))) {
                const suggestion = this.getSuggestion(match);
                this.violations.push({
                  file: filePath,
                  line: lineNumber,
                  content: line.trim(),
                  suggestion
                });
              }
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  private getSuggestion(hardcodedColor: string): string {
    // Check if we have a direct mapping
    if (SEMANTIC_MAPPINGS[hardcodedColor]) {
      return `Use ${SEMANTIC_MAPPINGS[hardcodedColor]} instead`;
    }

    // Generate generic suggestion based on color type
    if (hardcodedColor.startsWith('bg-')) {
      return 'Use semantic background color (bg-primary, bg-card, bg-secondary, etc.)';
    } else if (hardcodedColor.startsWith('text-')) {
      return 'Use semantic text color (text-foreground, text-muted-foreground, etc.)';
    } else if (hardcodedColor.startsWith('border-')) {
      return 'Use semantic border color (border-border, border-primary, etc.)';
    } else if (hardcodedColor.startsWith('ring-')) {
      return 'Use semantic ring color (ring-primary, ring-destructive, etc.)';
    }

    return 'Use semantic CSS variables instead of hardcoded colors';
  }

  generateReport(): string {
    let report = `# Color Validation Report\n\n`;
    report += `**Scan Summary:**\n`;
    report += `- Files scanned: ${this.fileCount}\n`;
    report += `- Total lines: ${this.totalLines}\n`;
    report += `- Violations found: ${this.violations.length}\n\n`;

    if (this.violations.length === 0) {
      report += `✅ **No hardcoded color violations found!**\n`;
      report += `All colors are using semantic CSS variables.\n`;
      return report;
    }

    report += `## Violations by File\n\n`;

    // Group violations by file
    const violationsByFile = this.violations.reduce((acc, violation) => {
      if (!acc[violation.file]) {
        acc[violation.file] = [];
      }
      acc[violation.file].push(violation);
      return acc;
    }, {} as Record<string, Violation[]>);

    for (const [file, violations] of Object.entries(violationsByFile)) {
      report += `### ${file}\n`;
      report += `**${violations.length} violations**\n\n`;
      
      violations.forEach(violation => {
        report += `- **Line ${violation.line}:** \`${violation.content}\`\n`;
        report += `  - 💡 ${violation.suggestion}\n`;
      });
      report += `\n`;
    }

    report += `## Recommendations\n\n`;
    report += `1. **Replace hardcoded colors** with semantic CSS variables\n`;
    report += `2. **Use the helper components** (StatusBadge, ActionButton) for consistent styling\n`;
    report += `3. **Test in dark mode** to ensure proper contrast\n`;
    report += `4. **Run this script regularly** to catch new violations\n\n`;

    return report;
  }

  getViolationCount(): number {
    return this.violations.length;
  }
}

// Main execution
function main() {
  const validator = new ColorValidator();
  const srcDir = join(process.cwd(), 'src');
  
  console.log('🔍 Scanning for hardcoded color violations...\n');
  
  validator.scanDirectory(srcDir);
  
  const report = validator.generateReport();
  console.log(report);
  
  const violationCount = validator.getViolationCount();
  if (violationCount > 0) {
    console.log(`❌ Found ${violationCount} violations. Please fix them before committing.`);
    process.exit(1);
  } else {
    console.log('✅ No violations found!');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ColorValidator };

