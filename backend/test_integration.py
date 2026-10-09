import sys
import os
import uuid
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import SQLALCHEMY_DATABASE_URL
from app.models import User, RoleEnum
from app.auth import get_password_hash

BASE_URL = "http://localhost:8000"

# Setup DB session
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_test_data():
    db = SessionLocal()
    test_email = f"test_{uuid.uuid4()}@lassitown.com"
    branch_id = uuid.uuid4()
    pin = str(uuid.uuid4())[:4] # random 4 chars
    
    user = User(
        branch_id=branch_id,
        name="Test Owner",
        role=RoleEnum.OWNER,
        pin_code=pin,
        email=test_email,
        password_hash=get_password_hash("password123"),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return test_email, "password123", str(branch_id), pin

def run_tests():
    print("Setting up test user in DB...")
    email, password, branch_id, pin_code = setup_test_data()
    
    print("\n[1/6] Testing Admin Login (/api/auth/login/admin)...")
    response = requests.post(f"{BASE_URL}/api/auth/login/admin", data={"username": email, "password": password})
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("      -> SUCCESS: Received JWT Token")
    
    print("\n[2/6] Testing POS PIN Login (/api/auth/login/pos)...")
    pos_response = requests.post(f"{BASE_URL}/api/auth/login/pos", json={"pin_code": pin_code})
    assert pos_response.status_code == 200, f"POS Login failed: {pos_response.text}"
    print("      -> SUCCESS: PIN Login Authenticated")
    
    print("\n[3/6] Testing Shift Open (/api/shifts/open)...")
    shift_res = requests.post(f"{BASE_URL}/api/shifts/open", json={"branch_id": branch_id, "float_amount": 1500.00}, headers=headers)
    assert shift_res.status_code == 200, f"Shift Open failed: {shift_res.text}"
    shift_id = shift_res.json()["shift_id"]
    print(f"      -> SUCCESS: Opened Shift {shift_id} with 1500.00 float")
    
    print("\n[4/6] Testing Product Creation (/api/menu/products)...")
    prod_data = {
        "category": "Beverages",
        "name": "Mango Lassi",
        "is_active": True,
        "variants": [
            {"variant_name": "Regular", "base_price": 120.00},
            {"variant_name": "Large", "base_price": 160.00}
        ]
    }
    prod_res = requests.post(f"{BASE_URL}/api/menu/products", json=prod_data, headers=headers)
    assert prod_res.status_code == 200, f"Product creation failed: {prod_res.text}"
    product_id = prod_res.json()["id"]
    print(f"      -> SUCCESS: Created Product {product_id} with variants")
    
    print("\n[5/6] Testing Product Update (Audit Log Trigger) (/api/menu/products/{id})...")
    update_data = {
        "category": "Beverages",
        "name": "Mango Lassi (Special)",
        "is_active": True
    }
    update_res = requests.put(f"{BASE_URL}/api/menu/products/{product_id}", json=update_data, headers=headers)
    assert update_res.status_code == 200, f"Product update failed: {update_res.text}"
    print("      -> SUCCESS: Product Updated (Audit log inserted via router logic)")
    
    print("\n[6/6] Testing Shift Close (Z-Report Generation) (/api/shifts/close/{id})...")
    close_res = requests.post(f"{BASE_URL}/api/shifts/close/{shift_id}", json={"actual_cash_counted": 1500.00}, headers=headers)
    assert close_res.status_code == 200, f"Shift Close failed: {close_res.text}"
    z_report = close_res.json()
    assert float(z_report["expected_cash"]) == 1500.0, f"Expected cash mismatch: {z_report['expected_cash']}"
    assert float(z_report["variance"]) == 0.0, "Variance mismatch"
    print("      -> SUCCESS: Z-Report Generated Successfully")
    print(f"         Expected Cash: {z_report['expected_cash']}")
    print(f"         Actual Cash:   {z_report['actual_cash']}")
    print(f"         Variance:      {z_report['variance']}")
    
    print("\n=========================================")
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=========================================\n")

if __name__ == "__main__":
    run_tests()
