import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DECIMAL, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import relationship
from .database import Base

# ENUM definitions
class RoleEnum(str):
    CASHIER = "CASHIER"
    MANAGER = "MANAGER"
    OWNER = "OWNER"

class ShiftStatusEnum(str):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class OrderTypeEnum(str):
    DINE_IN = "DINE_IN"
    TAKEAWAY = "TAKEAWAY"
    DELIVERY = "DELIVERY"

class OrderSourceEnum(str):
    IN_STORE = "IN_STORE"
    SWIGGY = "SWIGGY"
    ZOMATO = "ZOMATO"

class PaymentMethodEnum(str):
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    THIRD_PARTY = "THIRD_PARTY"

class TransactionTypeEnum(str):
    SALE = "SALE"
    PAYOUT = "PAYOUT"
    FLOAT = "FLOAT"

class User(Base):
    __tablename__ = "Users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), index=True) # Assuming branch is managed logically or in another unlisted table
    name = Column(String, nullable=False)
    role = Column(ENUM(RoleEnum.CASHIER, RoleEnum.MANAGER, RoleEnum.OWNER, name="role_enum"), nullable=False)
    pin_code = Column(String, nullable=False) # Store hashed in production
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Product(Base):
    __tablename__ = "Products"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    variants = relationship("ProductVariant", back_populates="product")

class ProductVariant(Base):
    __tablename__ = "Product_Variants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("Products.id"), nullable=False)
    variant_name = Column(String, nullable=False)
    base_price = Column(DECIMAL(10, 2), nullable=False)
    
    product = relationship("Product", back_populates="variants")

class Shift(Base):
    __tablename__ = "Shifts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), nullable=False)
    opened_by = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=False)
    closed_by = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=True)
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    float_amount = Column(DECIMAL(10, 2), nullable=False)
    actual_cash_counted = Column(DECIMAL(10, 2), nullable=True)
    status = Column(ENUM(ShiftStatusEnum.OPEN, ShiftStatusEnum.CLOSED, name="shift_status_enum"), nullable=False)

class Order(Base):
    __tablename__ = "Orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_id = Column(String, nullable=False, unique=True)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("Shifts.id"), nullable=True)
    cashier_id = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=False)
    order_type = Column(ENUM(OrderTypeEnum.DINE_IN, OrderTypeEnum.TAKEAWAY, OrderTypeEnum.DELIVERY, name="order_type_enum"), nullable=False)
    table_number = Column(Integer, nullable=True)
    order_source = Column(ENUM(OrderSourceEnum.IN_STORE, OrderSourceEnum.SWIGGY, OrderSourceEnum.ZOMATO, name="order_source_enum"), nullable=False)
    payment_method = Column(ENUM(PaymentMethodEnum.CASH, PaymentMethodEnum.UPI, PaymentMethodEnum.CARD, PaymentMethodEnum.THIRD_PARTY, name="payment_method_enum"), nullable=False)
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    tax_total = Column(DECIMAL(10, 2), nullable=False)
    net_total = Column(DECIMAL(10, 2), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), nullable=False, default=0)
    is_nc = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "Order_Items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("Orders.id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("Product_Variants.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price_at_sale = Column(DECIMAL(10, 2), nullable=False)
    cgst_rate = Column(DECIMAL(5, 2), nullable=False)
    sgst_rate = Column(DECIMAL(5, 2), nullable=False)
    special_notes = Column(String, nullable=True)
    
    order = relationship("Order", back_populates="items")

class CashLedger(Base):
    __tablename__ = "Cash_Ledger"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("Shifts.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=False)
    transaction_type = Column(ENUM(TransactionTypeEnum.SALE, TransactionTypeEnum.PAYOUT, TransactionTypeEnum.FLOAT, name="transaction_type_enum"), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    category = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "Audit_Logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("Users.id"), nullable=False)
    action = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    old_data = Column(JSONB, nullable=True)
    new_data = Column(JSONB, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
