// MigrationLogger - Structured logging for migration operations
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  phase: string;
  message: string;
  data?: unknown;
}

export class MigrationLogger {
  private logs: LogEntry[] = [];
  private currentPhase: string = 'init';

  setPhase(phase: string): void {
    this.currentPhase = phase;
    this.info(`フェーズ開始: ${phase}`);
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      phase: this.currentPhase,
      message,
      data
    };
    
    this.logs.push(entry);
    
    // Console output with formatting
    const icons = { debug: '🔍', info: 'ℹ️ ', warn: '⚠️ ', error: '❌' };
    const shortTime = entry.timestamp.split('T')[1].split('.')[0];
    console.log(`[${shortTime}] ${icons[level]} [${this.currentPhase}] ${message}`);
    
    if (data && level === 'debug') {
      console.log('   └─', JSON.stringify(data, null, 2).split('\n').join('\n      '));
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  exportToJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getSummary(): { total: number; errors: number; warnings: number } {
    return {
      total: this.logs.length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warn').length
    };
  }
}
