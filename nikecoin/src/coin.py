#!/usr/bin/env python3
"""
NikeCoin - Simple Python Implementation
"""

import sqlite3
import hashlib
import uuid
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, List
from pathlib import Path


@dataclass
class Transaction:
    id: str
    from_user: str
    to_user: str
    amount: int
    description: str
    timestamp: str


@dataclass
class Wallet:
    user_id: str
    balance: int
    total_minted: int
    total_spent: int
    created_at: str


class NikeCoinDB:
    def __init__(self, db_path: str = "data/nikecoin.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self._init_db()
    
    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS wallets (
                    user_id TEXT PRIMARY KEY,
                    balance INTEGER DEFAULT 0,
                    total_minted INTEGER DEFAULT 0,
                    total_spent INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    from_user TEXT,
                    to_user TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    description TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_user);
                CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_user);
            """)
            conn.commit()
    
    def get_wallet(self, user_id: str) -> Optional[Wallet]:
        """Get wallet by user ID"""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM wallets WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            
            if row:
                return Wallet(
                    user_id=row["user_id"],
                    balance=row["balance"],
                    total_minted=row["total_minted"],
                    total_spent=row["total_spent"],
                    created_at=row["created_at"]
                )
            return None
    
    def create_wallet(self, user_id: str) -> Wallet:
        """Create new wallet for user"""
        with self._connect() as conn:
            conn.execute(
                """INSERT OR IGNORE INTO wallets 
                   (user_id, balance, total_minted, total_spent)
                   VALUES (?, 0, 0, 0)""",
                (user_id,)
            )
            conn.commit()
        
        return self.get_wallet(user_id)
    
    def mint(self, user_id: str, amount: int, description: str = "Mint") -> bool:
        """Mint coins to user (admin only)"""
        if amount <= 0:
            return False
        
        tx_id = str(uuid.uuid4())[:8]
        
        with self._connect() as conn:
            # Create wallet if not exists
            self.create_wallet(user_id)
            
            # Update wallet
            conn.execute(
                """UPDATE wallets 
                   SET balance = balance + ?,
                       total_minted = total_minted + ?
                   WHERE user_id = ?""",
                (amount, amount, user_id)
            )
            
            # Record transaction
            conn.execute(
                """INSERT INTO transactions 
                   (id, from_user, to_user, amount, description)
                   VALUES (?, 'SYSTEM', ?, ?, ?)""",
                (tx_id, user_id, amount, description)
            )
            
            conn.commit()
        
        return True
    
    def transfer(self, from_user: str, to_user: str, amount: int, 
                 description: str = "Transfer") -> bool:
        """Transfer coins between users"""
        if amount <= 0 or from_user == to_user:
            return False
        
        tx_id = str(uuid.uuid4())[:8]
        
        with self._connect() as conn:
            # Check balance
            from_wallet = self.get_wallet(from_user)
            if not from_wallet or from_wallet.balance < amount:
                return False
            
            # Ensure recipient wallet exists
            self.create_wallet(to_user)
            
            # Deduct from sender
            conn.execute(
                """UPDATE wallets 
                   SET balance = balance - ?,
                       total_spent = total_spent + ?
                   WHERE user_id = ?""",
                (amount, amount, from_user)
            )
            
            # Add to recipient
            conn.execute(
                """UPDATE wallets 
                   SET balance = balance + ?
                   WHERE user_id = ?""",
                (amount, to_user)
            )
            
            # Record transaction
            conn.execute(
                """INSERT INTO transactions 
                   (id, from_user, to_user, amount, description)
                   VALUES (?, ?, ?, ?, ?)""",
                (tx_id, from_user, to_user, amount, description)
            )
            
            conn.commit()
        
        return True
    
    def get_history(self, user_id: str, limit: int = 20) -> List[Transaction]:
        """Get transaction history for user"""
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT * FROM transactions 
                   WHERE from_user = ? OR to_user = ?
                   ORDER BY timestamp DESC
                   LIMIT ?""",
                (user_id, user_id, limit)
            ).fetchall()
            
            return [
                Transaction(
                    id=row["id"],
                    from_user=row["from_user"],
                    to_user=row["to_user"],
                    amount=row["amount"],
                    description=row["description"],
                    timestamp=row["timestamp"]
                )
                for row in rows
            ]
    
    def list_all(self) -> List[Wallet]:
        """List all wallets"""
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT * FROM wallets 
                   ORDER BY balance DESC"""
            ).fetchall()
            
            return [
                Wallet(
                    user_id=row["user_id"],
                    balance=row["balance"],
                    total_minted=row["total_minted"],
                    total_spent=row["total_spent"],
                    created_at=row["created_at"]
                )
                for row in rows
            ]


class NikeCoin:
    """Main NikeCoin interface"""
    
    def __init__(self, db_path: str = "data/nikecoin.db"):
        self.db = NikeCoinDB(db_path)
    
    def balance(self, user_id: str) -> int:
        """Get user balance"""
        wallet = self.db.get_wallet(user_id)
        return wallet.balance if wallet else 0
    
    def mint(self, user_id: str, amount: int, reason: str = "") -> bool:
        """Mint coins to user"""
        desc = f"Mint: {reason}" if reason else "Mint"
        return self.db.mint(user_id, amount, desc)
    
    def send(self, from_user: str, to_user: str, amount: int, reason: str = "") -> bool:
        """Send coins from one user to another"""
        desc = f"Send: {reason}" if reason else "Send"
        return self.db.transfer(from_user, to_user, amount, desc)
    
    def history(self, user_id: str, limit: int = 10) -> List[Transaction]:
        """Get user transaction history"""
        return self.db.get_history(user_id, limit)
    
    def leaderboard(self) -> List[Wallet]:
        """Get all wallets sorted by balance"""
        return self.db.list_all()


if __name__ == "__main__":
    import sys
    
    coin = NikeCoin()
    
    if len(sys.argv) < 2:
        print("Usage: python coin.py <command> [args...]")
        print("")
        print("Commands:")
        print("  balance <user_id>              - Check balance")
        print("  mint <user_id> <amount> [reason]  - Mint coins (admin)")
        print("  send <from> <to> <amt> [reason]   - Send coins")
        print("  history <user_id> [limit]      - Show history")
        print("  list                           - List all users")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "balance":
        user = sys.argv[2]
        bal = coin.balance(user)
        print(f"💰 {user}: {bal} NikeCoins")
    
    elif cmd == "mint":
        user = sys.argv[2]
        amount = int(sys.argv[3])
        reason = sys.argv[4] if len(sys.argv) > 4 else ""
        if coin.mint(user, amount, reason):
            print(f"✅ Minted {amount} coins to {user}")
        else:
            print("❌ Failed")
    
    elif cmd == "send":
        from_u = sys.argv[2]
        to_u = sys.argv[3]
        amount = int(sys.argv[4])
        reason = sys.argv[5] if len(sys.argv) > 5 else ""
        if coin.send(from_u, to_u, amount, reason):
            print(f"💸 Sent {amount} coins: {from_u} → {to_u}")
        else:
            print("❌ Failed (insufficient balance?)")
    
    elif cmd == "history":
        user = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        txs = coin.history(user, limit)
        print(f"📜 History for {user}:")
        for tx in txs:
            direction = "→" if tx.from_user == user else "←"
            print(f"  [{tx.id}] {tx.timestamp} | {direction} {tx.amount} | {tx.description}")
    
    elif cmd == "list":
        wallets = coin.leaderboard()
        print("🏆 Leaderboard:")
        for w in wallets:
            print(f"  {w.user_id}: {w.balance} (minted: {w.total_minted}, spent: {w.total_spent})")
    
    else:
        print(f"Unknown command: {cmd}")
