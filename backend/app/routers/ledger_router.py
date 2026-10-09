from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CashLedger, User, TransactionTypeEnum
from ..auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/ledger", tags=["ledger"])

class LedgerEntry(BaseModel):
    amount: float
    transaction_type: str # 'FLOAT' or 'PAYOUT'
    notes: str

@router.post("")
def add_ledger_entry(entry: LedgerEntry, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t_type = TransactionTypeEnum.FLOAT if entry.transaction_type == 'FLOAT' else TransactionTypeEnum.PAYOUT
    db_entry = CashLedger(
        user_id=current_user.id,
        transaction_type=t_type,
        amount=entry.amount,
        category="Manual Entry",
        notes=entry.notes
    )
    db.add(db_entry)
    db.commit()
    return {"status": "success"}
