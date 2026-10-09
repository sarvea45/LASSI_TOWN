from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta

from ..database import get_db
from ..models import Order, OrderItem, ProductVariant, Product, User
from ..auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/items")
def get_item_wise_sales(start_date: str = None, end_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not start_date:
        start_date = date.today().isoformat()
    if not end_date:
        end_date = date.today().isoformat()
        
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    # Join OrderItem -> Order and OrderItem -> ProductVariant -> Product
    results = (
        db.query(
            Product.name.label('item_name'),
            Product.category,
            func.sum(OrderItem.qty).label('total_qty'),
            func.sum(OrderItem.unit_price_at_sale * OrderItem.qty).label('total_revenue')
        )
        .join(Order, OrderItem.order_id == Order.id)
        .join(ProductVariant, OrderItem.variant_id == ProductVariant.id)
        .join(Product, ProductVariant.product_id == Product.id)
        .filter(Order.created_at >= start_dt, Order.created_at < end_dt)
        .group_by(Product.name, Product.category)
        .order_by(func.sum(OrderItem.qty).desc())
        .all()
    )
    
    return [
        {
            "item_name": r.item_name,
            "category": r.category,
            "total_quantity_sold": int(r.total_qty),
            "total_revenue_generated": float(r.total_revenue)
        } for r in results
    ]

@router.get("/discounts")
def get_discounts_reports(start_date: str = None, end_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not start_date:
        start_date = date.today().isoformat()
    if not end_date:
        end_date = date.today().isoformat()
        
    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    orders = (
        db.query(Order)
        .filter(Order.created_at >= start_dt, Order.created_at < end_dt)
        .filter((Order.discount_amount > 0) | (Order.is_nc == True))
        .order_by(Order.created_at.desc())
        .all()
    )
    
    total_discounted = sum(o.discount_amount for o in orders if not o.is_nc)
    total_nc_lost = sum(o.subtotal + o.tax_total for o in orders if o.is_nc)
    
    transactions = [
        {
            "display_id": o.display_id,
            "created_at": o.created_at.isoformat(),
            "type": "NC" if o.is_nc else "DISCOUNT",
            "amount_lost": float(o.subtotal + o.tax_total) if o.is_nc else float(o.discount_amount),
            "original_amount": float(o.subtotal + o.tax_total)
        } for o in orders
    ]
    
    return {
        "total_discounted": float(total_discounted),
        "total_nc_lost": float(total_nc_lost),
        "transactions": transactions
    }
