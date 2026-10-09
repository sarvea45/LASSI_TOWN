from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from ..database import get_db
from ..models import Order, OrderItem, ProductVariant, CashLedger, Shift, User, ShiftStatusEnum, TransactionTypeEnum
from ..schemas import OrderCreate
from ..auth import get_current_user
from ..utils.printer import print_receipt_job

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("")
def create_order(order_data: OrderCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subtotal = Decimal('0.0')
    tax_total = Decimal('0.0')
    net_total = Decimal('0.0')
    
    order_items_db = []
    receipt_items = []
    
    for item in order_data.items:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} not found")
            
        unit_price = variant.base_price
        line_total = unit_price * item.qty
        
        cgst_rate = Decimal('2.5')
        sgst_rate = Decimal('2.5')
        tax_amount = (line_total * (cgst_rate + sgst_rate)) / Decimal('100.0')
        
        subtotal += line_total
        tax_total += tax_amount
        net_total += (line_total + tax_amount)
        
        order_item = OrderItem(
            variant_id=item.variant_id,
            qty=item.qty,
            unit_price_at_sale=unit_price,
            cgst_rate=cgst_rate,
            sgst_rate=sgst_rate,
            special_notes=item.special_notes
        )
        order_items_db.append(order_item)
        
        receipt_items.append({
            "variant_name": variant.variant_name,
            "qty": item.qty,
            "unit_price_at_sale": float(unit_price),
            "special_notes": item.special_notes
        })
        
    from datetime import date
    today = date.today()
    today_count = db.query(func.count(Order.id)).filter(func.date(Order.created_at) == today).scalar()
    
    date_str = today.strftime("%Y%m%d")
    display_id = f"ORD-{date_str}-{today_count + 1:03d}"
    
    final_payment_method = order_data.payment_method
    if order_data.order_source in ['SWIGGY', 'ZOMATO']:
        final_payment_method = 'THIRD_PARTY'
    
    new_order = Order(
        display_id=display_id,
        shift_id=None,
        cashier_id=current_user.id,
        order_type=order_data.order_type,
        table_number=order_data.table_number,
        order_source=order_data.order_source,
        payment_method=final_payment_method,
        subtotal=subtotal,
        tax_total=tax_total,
        net_total=net_total - order_data.discount_amount if not order_data.is_nc else Decimal('0.0'),
        discount_amount=order_data.discount_amount,
        is_nc=order_data.is_nc,
        is_locked=False
    )
    
    db.add(new_order)
    db.flush()
    
    for oi in order_items_db:
        oi.order_id = new_order.id
        db.add(oi)
        
    if final_payment_method == 'CASH':
        ledger_entry = CashLedger(
            shift_id=None,
            user_id=current_user.id,
            transaction_type=TransactionTypeEnum.SALE,
            amount=net_total,
            category="ORDER_SALE",
            notes=f"Order {display_id}"
        )
        db.add(ledger_entry)
        
    db.commit()
    
    receipt_data = {
        "display_id": display_id,
        "table_number": order_data.table_number,
        "order_type": order_data.order_type,
        "payment_method": final_payment_method,
        "subtotal": float(subtotal),
        "tax_total": float(tax_total),
        "discount_amount": float(order_data.discount_amount),
        "net_total": float(new_order.net_total),
        "created_at": new_order.created_at.isoformat() if new_order.created_at else None,
        "items": receipt_items
    }
    background_tasks.add_task(print_receipt_job, receipt_data)
    
    return {"detail": "Order created successfully", "order_id": new_order.id, "display_id": display_id}

@router.get("/daily")
def get_daily_sales(start_date: str = None, end_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date, datetime, timedelta
    
    if not start_date and not end_date:
        now = datetime.now()
        if now.hour < 3:
            business_date = (now - timedelta(days=1)).date()
        else:
            business_date = now.date()
        
        start_dt = datetime.combine(business_date, datetime.min.time()) + timedelta(hours=3)
        end_dt = start_dt + timedelta(days=1)
    else:
        if not start_date:
            start_date = date.today().isoformat()
        if not end_date:
            end_date = start_date
            
        start_dt = datetime.strptime(start_date, "%Y-%m-%d") + timedelta(hours=3)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1, hours=3)
    
    orders = db.query(Order).filter(Order.created_at >= start_dt, Order.created_at < end_dt).all()
    
    total_revenue = sum(o.net_total for o in orders)
    cash_total = sum(o.net_total for o in orders if o.payment_method == 'CASH')
    upi_card_total = sum(o.net_total for o in orders if o.payment_method in ['UPI', 'CARD'])
    third_party_total = sum(o.net_total for o in orders if o.payment_method == 'THIRD_PARTY')
    
    transactions = [
        {
            "display_id": o.display_id,
            "created_at": o.created_at.isoformat(),
            "net_total": float(o.net_total),
            "payment_method": o.payment_method,
            "order_type": o.order_type,
            "subtotal": float(o.subtotal),
            "tax_total": float(o.tax_total),
            "discount_amount": float(o.discount_amount),
            "is_nc": o.is_nc
        } for o in sorted(orders, key=lambda x: x.created_at, reverse=True)
    ]
    
    return {
        "total_revenue": float(total_revenue),
        "cash_total": float(cash_total),
        "upi_card_total": float(upi_card_total),
        "third_party_total": float(third_party_total),
        "transactions": transactions
    }
