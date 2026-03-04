#!/usr/bin/env python3
"""
ニケコイン - シンプル版データベース管理
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.join(DATA_DIR, 'nikecoin.db')

@dataclass
class Wallet:
    did: str
    balance: int
    created_at: datetime
    updated_at: datetime

@dataclass
class Transaction:
    tx_id: str
    from_did: Optional[str]
    to_did: str
    amount: int
    type: str
    description: str
    created_at: datetime

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._init_tables()
    
    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_tables(self):
        """テーブル初期化"""
        with self._get_conn() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS wallets (
                    did TEXT PRIMARY KEY,
                    balance INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS transactions (
                    tx_id TEXT PRIMARY KEY,
                    from_did TEXT,
                    to_did TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_did);
                CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_did);
                CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);
            ''')
    
    def get_wallet(self, did: str) -> Optional[Wallet]:
        """ウォレット取得（なければ作成）"""
        with self._get_conn() as conn:
            row = conn.execute(
                'SELECT * FROM wallets WHERE did = ?', (did,)
            ).fetchone()
            
            if row:
                return Wallet(
                    did=row['did'],
                    balance=row['balance'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    updated_at=datetime.fromisoformat(row['updated_at'])
                )
            
            # 新規作成
            conn.execute(
                'INSERT INTO wallets (did, balance) VALUES (?, 0)',
                (did,)
            )
            conn.commit()
            
            return self.get_wallet(did)
    
    def update_balance(self, did: str, amount: int) -> int:
        """残高更新（加算）"""
        with self._get_conn() as conn:
            conn.execute('''
                UPDATE wallets 
                SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE did = ?
            ''', (amount, did))
            conn.commit()
            
            row = conn.execute(
                'SELECT balance FROM wallets WHERE did = ?', (did,)
            ).fetchone()
            return row['balance'] if row else 0
    
    def set_balance(self, did: str, balance: int) -> int:
        """残高設定（直接上書き）"""
        with self._get_conn() as conn:
            conn.execute('''
                UPDATE wallets 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE did = ?
            ''', (balance, did))
            conn.commit()
            return balance
    
    def add_transaction(self, tx_id: str, from_did: Optional[str], to_did: str,
                       amount: int, tx_type: str, description: str = '') -> Transaction:
        """取引記録追加"""
        with self._get_conn() as conn:
            conn.execute('''
                INSERT INTO transactions (tx_id, from_did, to_did, amount, type, description)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (tx_id, from_did, to_did, amount, tx_type, description))
            conn.commit()
            
            row = conn.execute(
                'SELECT * FROM transactions WHERE tx_id = ?', (tx_id,)
            ).fetchone()
            
            return Transaction(
                tx_id=row['tx_id'],
                from_did=row['from_did'],
                to_did=row['to_did'],
                amount=row['amount'],
                type=row['type'],
                description=row['description'],
                created_at=datetime.fromisoformat(row['created_at'])
            )
    
    def get_transactions(self, did: str, limit: int = 20) -> List[Transaction]:
        """取引履歴取得"""
        with self._get_conn() as conn:
            rows = conn.execute('''
                SELECT * FROM transactions 
                WHERE from_did = ? OR to_did = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (did, did, limit)).fetchall()
            
            return [
                Transaction(
                    tx_id=row['tx_id'],
                    from_did=row['from_did'],
                    to_did=row['to_did'],
                    amount=row['amount'],
                    type=row['type'],
                    description=row['description'],
                    created_at=datetime.fromisoformat(row['created_at'])
                )
                for row in rows
            ]
    
    def get_all_wallets(self) -> List[Wallet]:
        """全ウォレット取得"""
        with self._get_conn() as conn:
            rows = conn.execute(
                'SELECT * FROM wallets ORDER BY balance DESC'
            ).fetchall()
            
            return [
                Wallet(
                    did=row['did'],
                    balance=row['balance'],
                    created_at=datetime.fromisoformat(row['created_at']),
                    updated_at=datetime.fromisoformat(row['updated_at'])
                )
                for row in rows
            ]
