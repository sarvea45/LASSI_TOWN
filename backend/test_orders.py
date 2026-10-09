import sys
import os
import requests

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
from app.database import SQLALCHEMY_DATABASE_URL
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BASE_URL = "http://localhost:8000"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_tests():
    print("Executing Phase 3: Transaction Engine Tests...")
    
    db = SessionLocal()
    from app.models import User, ProductVariant, Shift
    user = db.query(User).filter(User.email.like("test_%@lassitown.com")).first()
    if not user:
        print("No test user found. Please run Phase 2 tests first.")
        return
        
    res = requests.post(f"{BASE_URL}/api/auth/login/admin", data={"username": user.email, "password": "password123"})
    if res.status_code != 200:
        print("Failed to authenticate.")
        return
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
        
    shift = db.query(Shift).filter(Shift.status == "OPEN").first()
    if not shift:
        print("Opening new shift for testing...")
        requests.post(f"{BASE_URL}/api/shifts/open", json={"branch_id": str(user.branch_id), "float_amount": 1000.0}, headers=headers)
        
    variant = db.query(ProductVariant).first()
    if not variant:
        print("No product variant found in DB. Exiting.")
        return
        
    print("\n1. Testing Core Order API and Math...")
    order_payload = {
        "order_type": "DINE_IN",
        "table_number": 5,
        "order_source": "IN_STORE",
        "payment_method": "CASH",
        "items": [
            {
                "variant_id": str(variant.id),
                "qty": 2,
                "special_notes": "Extra sweet"
            }
        ]
    }
    
    order_res = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers)
    assert order_res.status_code == 200, f"Order failed: {order_res.text}"
    print("   -> Order API Success (Hardware task queued in background)")
    
    from app.models import Order
    order_db = db.query(Order).filter(Order.id == order_res.json()["order_id"]).first()
    
    expected_subtotal = float(variant.base_price * 2)
    expected_tax = expected_subtotal * 0.05
    expected_net = expected_subtotal + expected_tax
    
    assert float(order_db.subtotal) == expected_subtotal, f"Subtotal mismatch: {order_db.subtotal} != {expected_subtotal}"
    assert float(order_db.tax_total) == expected_tax, f"Tax mismatch: {order_db.tax_total} != {expected_tax}"
    assert float(order_db.net_total) == expected_net, f"Net total mismatch: {order_db.net_total} != {expected_net}"
    print(f"   -> Financial Math & GST (5%) Snapshotting Verified:")
    print(f"      Subtotal: {expected_subtotal}, Tax: {expected_tax}, Net: {expected_net}")
    
    print("\n2. Testing Aggregator Payment Override...")
    swiggy_payload = order_payload.copy()
    swiggy_payload["order_source"] = "SWIGGY"
    swiggy_payload["payment_method"] = "CASH" # Should be overridden
    swiggy_res = requests.post(f"{BASE_URL}/api/orders", json=swiggy_payload, headers=headers)
    assert swiggy_res.status_code == 200
    
    swiggy_db = db.query(Order).filter(Order.id == swiggy_res.json()["order_id"]).first()
    assert swiggy_db.payment_method == "THIRD_PARTY", "Aggregator override failed!"
    print("   -> Aggregator Payment Override Verified (CASH -> THIRD_PARTY)")
    db.close()
    
    print("\nAll Phase 3 Tests Passed Successfully!")

if __name__ == "__main__":
    run_tests()
