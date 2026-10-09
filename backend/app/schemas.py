import uuid
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class POSLogin(BaseModel):
    pin_code: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

# --- Menu Schemas ---
class ProductVariantBase(BaseModel):
    variant_name: str
    base_price: Decimal

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: uuid.UUID
    product_id: uuid.UUID

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    category: str
    name: str
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: List[ProductVariantCreate] = []

class ProductResponse(ProductBase):
    id: uuid.UUID
    variants: List[ProductVariantResponse] = []

    class Config:
        from_attributes = True

# --- Shift Schemas ---
class ShiftOpen(BaseModel):
    branch_id: uuid.UUID
    float_amount: Decimal

class ShiftClose(BaseModel):
    actual_cash_counted: Decimal

class ZReportResponse(BaseModel):
    shift_id: uuid.UUID
    expected_cash: Decimal
    actual_cash: Decimal
    variance: Decimal
    drawer_cash: Decimal
    direct_bank: Decimal
    receivables: Decimal

# --- Order Schemas ---
class OrderItemCreate(BaseModel):
    variant_id: uuid.UUID
    qty: int
    special_notes: Optional[str] = None

class OrderCreate(BaseModel):
    order_type: str
    table_number: Optional[int] = None
    order_source: str
    payment_method: str
    discount_amount: Decimal = Decimal('0.0')
    is_nc: bool = False
    items: List[OrderItemCreate]
