import { Result, err } from 'neverthrow';

/**
 * 【防衛プロトコル】情報の盾
 * 
 * 生のSQLエラーを内部に留め、外部には抽象化されたメッセージのみを返す
 */

export type ErrorCategory = 
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR' 
  | 'NOT_FOUND'
  | 'CONCURRENT_MODIFICATION'
  | 'INSUFFICIENT_FUNDS'
  | 'UNKNOWN_ERROR';

interface MappedError {
  category: ErrorCategory;
  publicMessage: string;
  internalDetails: string;
}

export class ErrorMapper {
  private static readonly ERROR_PATTERNS: Array<{
    pattern: RegExp;
    category: ErrorCategory;
    publicMessage: string;
  }> = [
    { pattern: /no such table/i, category: 'DATABASE_ERROR', publicMessage: 'DatabaseError: 操作に失敗しました' },
    { pattern: /no such column/i, category: 'DATABASE_ERROR', publicMessage: 'DatabaseError: 操作に失敗しました' },
    { pattern: /database is locked/i, category: 'CONCURRENT_MODIFICATION', publicMessage: 'ConcurrentError: 他の操作と競合しました。再試行してください' },
    { pattern: /concurrent modification/i, category: 'CONCURRENT_MODIFICATION', publicMessage: 'ConcurrentError: 他の操作と競合しました。再試行してください' },
    { pattern: /wallet not found/i, category: 'NOT_FOUND', publicMessage: 'NotFoundError: 指定されたウォレットが見つかりません' },
    { pattern: /.*/, category: 'UNKNOWN_ERROR', publicMessage: 'SystemError: 予期せぬエラーが発生しました' }
  ];

  static map<T>(error: Error, context?: string): Result<T, Error> {
    const mapped = this.mapError(error);
    
    // ログには詳細情報を出力
    console.error(`[${mapped.category}] ${context || ''}`, {
      internalDetails: mapped.internalDetails,
      timestamp: new Date().toISOString()
    });

    // 呼び出し元には抽象化されたメッセージのみ
    return err(new Error(mapped.publicMessage));
  }

  private static mapError(error: Error): MappedError {
    const message = error.message;
    
    for (const { pattern, category, publicMessage } of this.ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return {
          category,
          publicMessage,
          internalDetails: `[${category}] ${message}\nStack: ${error.stack || 'N/A'}`
        };
      }
    }

    return {
      category: 'UNKNOWN_ERROR',
      publicMessage: 'SystemError: 予期せぬエラーが発生しました',
      internalDetails: `[UNEXPECTED] ${message}`
    };
  }
}
