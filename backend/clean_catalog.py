import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Product

def clean_catalog():
    db = SessionLocal()
    products = db.query(Product).all()

    for p in products:
        # 1. Merge Pizza Categories
        if p.category in ['PIZZAS', 'VEG SPECIAL PIZZAS']:
            p.category = 'VEG PIZZAS'
        elif p.category == 'NON - VEG SPECIAL PIZZAS':
            p.category = 'NON-VEG PIZZAS'

        # 2. Fix typos
        if "Chiken" in p.name:
            p.name = p.name.replace("Chiken", "Chicken")

        # 3. Re-categorize specific items
        # Move "Capsicum Panner" and "Onion Panner" to VEG PIZZAS
        if "Capsicum Panner" in p.name or "Onion Panner" in p.name:
            p.category = 'VEG PIZZAS'

        # 4. Append "Pizza"
        if p.category in ['VEG PIZZAS', 'NON-VEG PIZZAS']:
            if not p.name.lower().endswith("pizza"):
                p.name = p.name.strip() + " Pizza"

    db.commit()
    print("Catalog cleaned successfully!")
    db.close()

if __name__ == "__main__":
    clean_catalog()
