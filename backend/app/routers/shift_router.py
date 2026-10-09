from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from ..database import get_db
from ..models import Shift, CashLedger, Order, User, ShiftStatusEnum, TransactionTypeEnum, PaymentMethodEnum
from ..schemas import ShiftOpen, ShiftClose, ZReportResponse
from ..auth import get_current_user, get_manager_user

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

@router.post("/open", response_model=dict)
def open_shift(shift_data: ShiftOpen, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Shift).filter(Shift.branch_id == shift_data.branch_id, Shift.status == ShiftStatusEnum.OPEN).first()
    if existing:
        return {"detail": "Shift already open", "shift_id": existing.id}
        
    new_shift = Shift(
        branch_id=shift_data.branch_id,
        opened_by=current_user.id,
        float_amount=shift_data.float_amount,
        status=ShiftStatusEnum.OPEN
    )
    db.add(new_shift)
    db.flush()
    
    # Insert FLOAT into Cash_Ledger
    ledger_entry = CashLedger(
        shift_id=new_shift.id,
        user_id=current_user.id,
        transaction_type=TransactionTypeEnum.FLOAT,
        amount=shift_data.float_amount,
        category="SHIFT_OPEN",
        notes="Opening float"
    )
    db.add(ledger_entry)
    db.commit()
    
    return {"detail": "Shift opened successfully", "shift_id": new_shift.id}

@router.post("/close/{shift_id}", response_model=ZReportResponse)
def close_shift(shift_id: UUID, close_data: ShiftClose, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.status == ShiftStatusEnum.OPEN).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Active shift not found")
        
    # Calculate Expected Cash from Cash_Ledger
    ledger_entries = db.query(
        CashLedger.transaction_type, 
        func.sum(CashLedger.amount).label("total")
    ).filter(CashLedger.shift_id == shift_id).group_by(CashLedger.transaction_type).all()
    
    float_total = Decimal('0.0')
    sale_total = Decimal('0.0')
    payout_total = Decimal('0.0')
    
    for entry in ledger_entries:
        if entry.transaction_type == TransactionTypeEnum.FLOAT:
            float_total = entry.total or Decimal('0.0')
        elif entry.transaction_type == TransactionTypeEnum.SALE:
            sale_total = entry.total or Decimal('0.0')
        elif entry.transaction_type == TransactionTypeEnum.PAYOUT:
            payout_total = entry.total or Decimal('0.0')
            
    expected_cash = float_total + sale_total - payout_total
    
    # Calculate Direct Bank & Receivables from Orders
    order_entries = db.query(
        Order.payment_method,
        func.sum(Order.net_total).label("total")
    ).filter(Order.shift_id == shift_id).group_by(Order.payment_method).all()
    
    direct_bank = Decimal('0.0')
    receivables = Decimal('0.0')
    
    for entry in order_entries:
        total = entry.total or Decimal('0.0')
        if entry.payment_method in [PaymentMethodEnum.UPI, PaymentMethodEnum.CARD]:
            direct_bank += total
        elif entry.payment_method == PaymentMethodEnum.THIRD_PARTY:
            receivables += total
            
    actual_cash = close_data.actual_cash_counted
    variance = actual_cash - expected_cash
    
    # Close shift
    shift.status = ShiftStatusEnum.CLOSED
    shift.closed_by = current_user.id
    shift.closed_at = datetime.utcnow()
    shift.actual_cash_counted = actual_cash
    
    # Lock orders
    db.query(Order).filter(Order.shift_id == shift_id).update({"is_locked": True})
    db.commit()
    
    return ZReportResponse(
        shift_id=shift_id,
        expected_cash=expected_cash,
        actual_cash=actual_cash,
        variance=variance,
        drawer_cash=expected_cash,
        direct_bank=direct_bank,
        receivables=receivables
    )

@router.get("/current/{shift_id}")
def get_current_shift(shift_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    ledger_entries = db.query(CashLedger.transaction_type, func.sum(CashLedger.amount).label("total")).filter(CashLedger.shift_id == shift_id).group_by(CashLedger.transaction_type).all()
    float_total = Decimal('0.0')
    sale_total = Decimal('0.0')
    payout_total = Decimal('0.0')
    for entry in ledger_entries:
        if entry.transaction_type == TransactionTypeEnum.FLOAT: float_total = entry.total or Decimal('0.0')
        elif entry.transaction_type == TransactionTypeEnum.SALE: sale_total = entry.total or Decimal('0.0')
        elif entry.transaction_type == TransactionTypeEnum.PAYOUT: payout_total = entry.total or Decimal('0.0')
            
    expected_cash = float_total + sale_total - payout_total
    
    order_entries = db.query(Order.payment_method, func.sum(Order.net_total).label("total")).filter(Order.shift_id == shift_id).group_by(Order.payment_method).all()
    direct_bank = Decimal('0.0')
    receivables = Decimal('0.0')
    for entry in order_entries:
        if entry.payment_method in [PaymentMethodEnum.UPI, PaymentMethodEnum.CARD]: direct_bank += entry.total or Decimal('0.0')
        elif entry.payment_method == PaymentMethodEnum.THIRD_PARTY: receivables += entry.total or Decimal('0.0')
            
    return {
        "float_amount": float_total,
        "cash_sales": sale_total,
        "expected_cash": expected_cash,
        "upi_card": direct_bank,
        "swiggy_zomato": receivables
    }

@router.get("/history")
def get_shift_history(db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    shifts = db.query(Shift).filter(Shift.status == ShiftStatusEnum.CLOSED).order_by(Shift.closed_at.desc()).limit(20).all()
    res = []
    for s in shifts:
        # Calculate expected for historical (in real app we'd save this to DB)
        ledger_entries = db.query(CashLedger.transaction_type, func.sum(CashLedger.amount).label("total")).filter(CashLedger.shift_id == s.id).group_by(CashLedger.transaction_type).all()
        float_total = sum([e.total for e in ledger_entries if e.transaction_type == TransactionTypeEnum.FLOAT]) or Decimal('0.0')
        sale_total = sum([e.total for e in ledger_entries if e.transaction_type == TransactionTypeEnum.SALE]) or Decimal('0.0')
        payout_total = sum([e.total for e in ledger_entries if e.transaction_type == TransactionTypeEnum.PAYOUT]) or Decimal('0.0')
        expected = float_total + sale_total - payout_total
        variance = (s.actual_cash_counted or Decimal('0.0')) - expected
        
        res.append({
            "id": s.id,
            "opened_at": s.opened_at,
            "closed_at": s.closed_at,
            "expected_cash": expected,
            "actual_cash": s.actual_cash_counted,
            "variance": variance
        })
    return res
