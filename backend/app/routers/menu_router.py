from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import json

from ..database import get_db
from ..models import Product, ProductVariant, AuditLog, User
from ..schemas import ProductCreate, ProductResponse, ProductBase
from ..auth import get_manager_user, get_current_user

router = APIRouter(prefix="/api/menu", tags=["menu"])

class AlchemyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def model_to_dict(model):
    d = {c.name: getattr(model, c.name) for c in model.__table__.columns}
    return json.loads(json.dumps(d, cls=AlchemyEncoder))

def create_audit_log(db: Session, user_id: UUID, action: str, table_name: str, record_id: UUID, old_data: dict, new_data: dict = None):
    audit = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_data=old_data,
        new_data=new_data
    )
    db.add(audit)

@router.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@router.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    db_product = Product(category=product.category, name=product.name, is_active=product.is_active)
    db.add(db_product)
    db.flush()
    for variant in product.variants:
        db_variant = ProductVariant(product_id=db_product.id, variant_name=variant.variant_name, base_price=variant.base_price)
        db.add(db_variant)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: UUID, product_update: ProductBase, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    old_data = model_to_dict(db_product)
    
    db_product.category = product_update.category
    db_product.name = product_update.name
    db_product.is_active = product_update.is_active
    db.flush()
    
    new_data = model_to_dict(db_product)
    
    create_audit_log(db, current_user.id, "UPDATE", "Products", product_id, old_data, new_data)
    db.commit()
    db.refresh(db_product)
    return db_product

from pydantic import BaseModel
class VariantUpdate(BaseModel):
    base_price: Decimal
    
@router.put("/variants/{variant_id}")
def update_variant(variant_id: UUID, variant_update: VariantUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    db_var = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variant not found")
        
    old_data = model_to_dict(db_var)
    db_var.base_price = variant_update.base_price
    db.flush()
    new_data = model_to_dict(db_var)
    
    create_audit_log(db, current_user.id, "UPDATE", "ProductVariants", variant_id, old_data, new_data)
    db.commit()
    return {"detail": "Variant updated"}

@router.delete("/products/{product_id}")
def delete_product(product_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    old_data = model_to_dict(db_product)
    
    # Delete variants first
    db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete()
    
    create_audit_log(db, current_user.id, "DELETE", "Products", product_id, old_data, None)
    db.delete(db_product)
    db.commit()
    return {"detail": "Product deleted"}
from pydantic import BaseModel
class CategoryRename(BaseModel):
    old_name: str
    new_name: str

@router.put("/categories/rename")
def rename_category(payload: CategoryRename, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    products = db.query(Product).filter(Product.category == payload.old_name).all()
    for p in products:
        p.category = payload.new_name
    db.commit()
    return {"detail": "Renamed"}

@router.delete("/categories/{category_name}")
def delete_category(category_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_manager_user)):
    products = db.query(Product).filter(Product.category == category_name).all()
    for p in products:
        db.query(ProductVariant).filter(ProductVariant.product_id == p.id).delete()
        db.delete(p)
    db.commit()
    return {"detail": "Category deleted"}
