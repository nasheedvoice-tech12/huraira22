import fs from 'fs';
import path from 'path';

export class BrainLogger {
  private logFilePath: string;

  constructor(baseDir?: string) {
    const root = baseDir || path.resolve(process.cwd(), 'second brain');
    this.logFilePath = path.join(root, 'log.md');
    this.ensureLogFile();
  }

  private ensureLogFile() {
    try {
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(
          this.logFilePath,
          `# VELCORA SECOND BRAIN — AUDIT & TELEMETRY LOG\n\n| Timestamp | Level | Tenant | Module | Action | Details |\n|---|---|---|---|---|---|\n`,
          'utf8'
        );
      }
    } catch (e) {
      // Ignore if in test env
    }
  }

  public log(
    level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'LEARN',
    tenantId: string,
    module: string,
    action: string,
    details: string | Record<string, any>
  ) {
    const timestamp = new Date().toISOString();
    const detailStr = typeof details === 'string' ? details : JSON.stringify(details).replace(/\|/g, '\\|');
    const row = `| ${timestamp} | **${level}** | \`${tenantId || 'global'}\` | \`${module}\` | ${action} | ${detailStr} |\n`;

    try {
      this.ensureLogFile();
      fs.appendFileSync(this.logFilePath, row, 'utf8');
    } catch (err) {
      console.warn('[SecondBrainLogger] Failed to write log:', err);
    }
  }

  public info(tenantId: string, module: string, action: string, details: string | Record<string, any>) {
    this.log('INFO', tenantId, module, action, details);
  }

  public warn(tenantId: string, module: string, action: string, details: string | Record<string, any>) {
    this.log('WARN', tenantId, module, action, details);
  }

  public error(tenantId: string, module: string, action: string, details: string | Record<string, any>) {
    this.log('ERROR', tenantId, module, action, details);
  }

  public audit(tenantId: string, module: string, action: string, details: string | Record<string, any>) {
    this.log('AUDIT', tenantId, module, action, details);
  }

  public learn(tenantId: string, module: string, action: string, details: string | Record<string, any>) {
    this.log('LEARN', tenantId, module, action, details);
  }
}

export const logger = new BrainLogger();
