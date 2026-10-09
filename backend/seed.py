import os
import sys
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Product, ProductVariant, OrderItem, Order, CashLedger, Shift

def seed_menu():
    db = SessionLocal()
    
    # Wipe transactional data first due to FK constraints
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.query(CashLedger).delete()
    db.query(Shift).delete()
    
    # Wipe existing products
    db.query(ProductVariant).delete()
    db.query(Product).delete()
    db.commit()

    menu = [
        {"category": "LASSI", "items": [
            ("Sweet", 55), ("Banana", 75), ("Chocolate", 75), ("Mango", 85), ("Fruit", 85), ("Black Current", 85), ("Strawberry", 95), ("Pineapple", 95), ("Kiwi", 95), ("Blueberry", 95), ("Bubble Gum", 95), ("Dry Fruit", 105), ("Cranberry", 105), ("Caramel", 105), ("Popcorn", 105), ("Nutella", 105), ("Royal Dry Fruit", 105)
        ]},
        {"category": "FALOODA & PROTIEN", "items": [
            ("Royal Falooda", 170), ("Fruit Falooda", 160), ("Dry Fruit Falooda", 190), ("Kesar Falooda", 125), ("Falooda", 115), ("Natural Whey Protien", 145)
        ]},
        {"category": "SMOOTHIES", "items": [
            ("Banana", 150), ("Mango", 150), ("Strawberry", 150), ("Pineapple", 155), ("Cranberry", 155), ("Green Apple", 155), ("Black Currant", 155), ("Blueberry", 155)
        ]},
        {"category": "MOJITO", "items": [
            ("Classic Mint", 105), ("Ginger", 105), ("Blue Lagoon", 115), ("Green Apple", 115), ("Kiwi", 115), ("Strawberry", 115), ("Virgin", 115), ("Pineapple", 115), ("Black Currant", 125), ("Coconut", 125), ("Blue Berry", 135), ("Cranberry", 135)
        ]},
        {"category": "COLD COFFEE", "items": [
            ("Hard Rock", 95), ("Irish", 105), ("Strawberry", 115), ("Chocolate", 115), ("Belgium", 135), ("Coffee On The Rock", 135), ("Swedish House Mafia", 135), ("Mud", 135), ("Ferrero", 135)
        ]},
        {"category": "JUICE & NO SUGAR", "items": [
            ("Ginger Lime", 65), ("Muskmelon", 75), ("Jal Jeera", 75), ("Moroccon Mint Lime", 75), ("Pineapple", 85), ("Watermelon", 95), ("Grape", 95), ("Blue Lime", 95), ("Berry Pepper Shot", 95), ("Carrot Ginger Lime", 95), ("Dragon Fruit", 125), ("Red Dragon Fruit", 135), ("Pomegranate", 115), ("Carrot Apple Pineapple CAP", 125), ("Apple Beetroot Carrot ABC", 125)
        ]},
        {"category": "THICKSHAKES", "items": [
            ("American Vanilla", 170), ("Natural Banana", 170), ("Natural Chickoo", 170), ("Natural Muskmelon", 170), ("Berry Berry Strawberry", 180), ("Blueberry", 180), ("Chilled Boost", 180), ("Chilled Milo", 180), ("Belgium Chocolate", 190), ("Brown Caramel", 200), ("Brownie Fullyloaded", 200), ("Five Star Fullyloaded", 200), ("Dairy Milk Fullyloaded", 200), ("Peanut Butter", 200), ("Butterscotch", 180), ("Hard Rock Coffee", 180), ("Oreo Fullyloaded", 180), ("Snickers Fullyloaded", 180), ("Caramel Coffee", 190), ("Clear Coffee", 190), ("Clear Chocolate", 190), ("Nutella", 190), ("Bubblegum", 190), ("Popcorn", 190), ("Triple Oreo Fullyloaded", 200), ("Nutella Brownie", 200), ("Kitkat Fullyloaded", 200), ("Oreo Nutella", 190), ("Bourbon Biscoff", 190)
        ]},
        {"category": "SHAKES", "items": [
            ("Banana", 95), ("Chickoo", 95), ("Musk Melon", 95), ("Vanilla", 105), ("Belgium Chocolate", 105), ("Banana Bonkers", 105), ("Very Berry Strawberry", 105), ("Pineapple", 105), ("Mango Alphonso", 115), ("Pomegranate", 115), ("Papaya N Cream", 115), ("Brownie", 115), ("Peanut Butter", 115), ("Custard Apple", 115), ("Red Banana", 115), ("Kiwi", 115), ("Green Apple", 115), ("Cold Boost", 115), ("Cold Milo", 115), ("Oreo", 115), ("Tropical Mix Fruit", 115), ("Mango Strawberry", 115), ("Popcorn", 115), ("Bubble Gum", 125), ("Frozen Borbon", 125), ("Black Currant", 125), ("Carmel Banana", 125), ("Peanut Butter Banana", 125), ("Belgian Chips", 125), ("Body Cooler", 135), ("Crunch N Crunch", 135), ("Kitkat", 135), ("Iranian Dates", 135), ("Oreo Brownie", 135), ("Missisippi Mud", 135), ("Monte Carlo Vanilla", 135), ("Hop Scotch Butterscotch", 135), ("Papaya N Lychee", 135), ("Nutella", 135), ("Special Paan", 135), ("Snickers", 135), ("Dry Fruit", 145), ("Blueberry Lychee", 145), ("Lychee N Lychee", 145), ("Berry Blue Berry", 145), ("Cranberry", 145), ("Dragon Fruit Peach", 145), ("Kitkat Mud", 160), ("Blueberry Dryfruit", 160), ("Lychee N Mango", 160), ("Royal Dry Fruit", 170)
        ]},
        {"category": "FREAKSHAKES", "items": [
            ("Banana", 180), ("Banana Bommer", 180), ("Mango", 180), ("Musk Melon", 180), ("Chickoo", 180), ("Berry Berry Strawberry", 180), ("Vanilla", 180), ("Belgium Chocolate", 180), ("Oreo", 180), ("Brownie", 190), ("Butterscotch", 190), ("Kitkat", 200), ("Snickers", 200), ("Chilled Milo", 200), ("Chilled Boost", 200), ("Orao Fullyloaded", 210), ("Kitkat Fullyloaded", 210), ("Clear Chocolate", 210), ("Nutella", 210), ("Bourbon Biscoff", 220)
        ]},
        {"category": "ICE CREAMS", "items": [
            ("Fruit Salad With Venella", 100), ("Chocolate Fudge", 100), ("American Brownie", 110), ("Fruit Salad With Strawberry", 125), ("Fruit Salad With Mango", 125), ("Lychee With Ice Cream", 125), ("Butter Scotch Fudge", 135), ("Death By Chocolate", 135), ("Dry Fruit Sundoe", 135), ("Nutella Fudge", 145), ("Fruit Overloaded", 145), ("Nutella Brownie", 145), ("Nutella Butter Scotch", 145), ("Nutella Chocolate", 145), ("Nutella Lychees", 145), ("Nutella Cookies", 145), ("Vip Fruit Salad", 155), ("Nutella Chocolato Brownio", 165)
        ]},
        {"category": "WAFFLE & HOT DESSERTS", "items": [
            ("Chocolate Waffle", 115), ("Nutella Waffle", 125), ("Red Velvet Waffle", 135), ("Oreo Waffle", 135), ("Classic Belgium Waffle", 135), ("Honey Butter Waffle", 165), ("Snickers Waffle", 165), ("Kitkat Waffle", 165), ("Naked Nutella", 165), ("Butterscotch Crunch", 165), ("Hot Death By Chocolate", 240), ("Hot Venella Sizzling Brownie", 270), ("Hot Chocolate Sizzling Brownie", 325), ("Chocolava Cake", 200)
        ]},
        {"category": "BURGER", "items": [
            ("Veg Burger", 105), ("Cheese Burger", 115), ("Panner Burger", 125), ("Fried Chiken Burger", 135)
        ]},
        {"category": "FRENCH FRIES", "items": [
            ("Classic Fries", 105), ("Masala Fries", 115), ("Peri Peri Fries", 135)
        ]},
        {"category": "SANDWICH", "items": [
            ("Veg Sandwich", 105), ("Cheese Sandwich", 115), ("Panner Sandwich", 125), ("Chilly Cheese Sandwich", 125), ("Chicken Sandwich", 125), ("Fried Chiken Sandwich", 195)
        ]},
        {"category": "WRAPS", "items": [
            ("Veg Wrap", 105), ("Chicken Wrap", 160), ("Panner Wrap", 140), ("Mushroom Wrap", 130)
        ]},
        {"category": "MOMOS", "items": [
            ("Veg Momos", 95), ("Mushroom Momos", 105), ("Chiken Momos", 115), ("Panner Momos", 125)
        ]},
        {"category": "NUGGETS", "items": [
            ("Veg Nuggets", 95), ("Cheese Nuggets", 110), ("Chiken Nuggets", 135)
        ]},
        {"category": "FRIED CHICKEN", "items": [
            ("Crunchy Pop Corn", 155), ("Crunchy Fried Strips", 185), ("Chicken Crunchy Leg Piece 1", 120), ("Chicken Crunchy Leg Piece 2", 210), ("Cruchy Lollypops 4pc", 265), ("Chicken Wings 6pc", 265)
        ]},
        {"category": "PIZZAS", "items": [
            ("Veg Pizza", [("Reg", 180), ("Med", 210), ("Large", 250)]),
            ("Onion", [("Reg", 190), ("Med", 240), ("Large", 285)]),
            ("Capsicum", [("Reg", 200), ("Med", 255), ("Large", 305)]),
            ("Mushroom", [("Reg", 210), ("Med", 255), ("Large", 320)]),
            ("Corn", [("Reg", 200), ("Med", 270), ("Large", 305)]),
            ("Panner", [("Reg", 230), ("Med", 295), ("Large", 350)])
        ]},
        {"category": "VEG SPECIAL PIZZAS", "items": [
            ("Garden Fresh", [("Reg", 190), ("Med", 250), ("Large", 290)]),
            ("Indian Masala", [("Reg", 190), ("Med", 240), ("Large", 270)]),
            ("Creamy Mushroom", [("Reg", 190), ("Med", 250), ("Large", 300)]),
            ("Mediterranean Veg", [("Reg", 200), ("Med", 250), ("Large", 305)]),
            ("Veggi Supreme", [("Reg", 200), ("Med", 250), ("Large", 305)]),
            ("Corn And Cheese Delight", [("Reg", 210), ("Med", 270), ("Large", 310)]),
            ("Veggie Overloaded", [("Reg", 210), ("Med", 270), ("Large", 310)]),
            ("Spicy Panner Thikka", [("Reg", 220), ("Med", 280), ("Large", 320)]),
            ("Butter Panner", [("Reg", 225), ("Med", 285), ("Large", 325)])
        ]},
        {"category": "NON - VEG SPECIAL PIZZAS", "items": [
            ("Chiken", [("Reg", 240), ("Med", 310), ("Large", 350)]),
            ("Mixed Pizza", [("Reg", 280), ("Med", 365), ("Large", 435)]),
            ("Capsicum Panner", [("Reg", 220), ("Med", 280), ("Large", 335)]),
            ("Onion Panner", [("Reg", 220), ("Med", 280), ("Large", 335)]),
            ("Chiken Thikka", [("Reg", 200), ("Med", 240), ("Large", 375)]),
            ("Chiken BBQ", [("Reg", 210), ("Med", 250), ("Large", 365)]),
            ("Peri Peri Chiken", [("Reg", 200), ("Med", 240), ("Large", 375)]),
            ("Chiken Sausage", [("Reg", 220), ("Med", 280), ("Large", 360)]),
            ("Butter Chiken", [("Reg", 210), ("Med", 270), ("Large", 390)]),
            ("Chiken Kepma", [("Reg", 200), ("Med", 260), ("Large", 400)]),
            ("Chiken Supreme", [("Reg", 240), ("Med", 280), ("Large", 375)])
        ]},
        {"category": "NON VEG STARTERS", "items": [
            ("Chicken 65", 220), ("Chilly Chicken", 220), ("Chicken Manchuria", 220), ("Dragon Chicken", 275), ("Chicken Lollypops 4pc", 275), ("Appolo Chicken", 275), ("Appolo Fish", 275), ("Chilly Prawns", 285), ("Prawn Manchuria", 285), ("Loose Prawn", 290), ("Chilly Fish", 305), ("Chicken Megistics", 305), ("Thaiky Chicken", 325), ("Chicken 555", 325), ("Hongkon Chicken", 325), ("Shezwan Chicken", 325), ("Garlic Chicken", 335), ("Lagoon Chicken", 335), ("Mangolian Chicken", 335)
        ]},
        {"category": "VEG STARTERS", "items": [
            ("Chilly Panner", 220), ("Panner Manchuria", 240), ("Panner 65", 240), ("Babycorn Panner", 240), ("Babycorn Manchuria", 240), ("Babycorn 65", 275), ("Chilly Mashroom", 275), ("Mashroom Manchuria", 275), ("Mashroom 65", 275), ("Crispy Veg", 220)
        ]},
        {"category": "SOUPS", "items": [
            ("Chicken Hot and Sour Soup", 155), ("Veg Hot and Soure Soup", 180), ("Chicken Dragon Soup", 160), ("Chicken Mancho Soup", 155), ("Veg Mancho Soup", 160)
        ]},
        {"category": "FRIED RICE", "items": [
            ("Veg Fried Rice", 155), ("Egg Friedrice", 180), ("Chiken Friedrice", 190), ("Schezwan Chiken Friedrice", 220), ("Schezwan Veg Friedrice", 190)
        ]},
        {"category": "NOODLES", "items": [
            ("Veg Noodles", 155), ("Egg Noodles", 180), ("Chiken Noodles", 190), ("Schezwan Veg Noodles", 135), ("Schezwan Chiken Noodles", 220)
        ]},
        {"category": "SNACKS", "items": [
            ("Veg Maggie", 125), ("Chicken Maggie", 135), ("Veg Pasta", 210), ("Chicken Pasta", 285)
        ]}
    ]

    for cat in menu:
        category_name = cat["category"]
        for item in cat["items"]:
            # Format explicit item name
            raw_name = item[0]
            
            # Auto-append category name to raw_name if it's missing (for beverages/desserts)
            # and if the category is not pizzas/starters where it might be redundant
            skip_append = ['STARTER', 'PIZZA', 'RICE', 'NOODLE', 'MOMO', 'NUGGET', 'SNACK']
            if not any(s in category_name.upper() for s in skip_append) and not ('WRAP' in category_name.upper()):
                # e.g., if category is "COLD COFFEE" and name is "Hard Rock"
                if category_name.lower() not in raw_name.lower():
                    # Handle special cases where category name might be weird to append directly
                    suffix = category_name.title()
                    if suffix == "Lassi" or suffix == "Cold Coffee" or suffix == "Thickshakes" or suffix == "Shakes" or suffix == "Freakshakes" or suffix == "Smoothies" or suffix == "Mojito":
                        if suffix.endswith('s'): suffix = suffix[:-1] # Remove plural
                        raw_name = f"{raw_name} {suffix}"
            
            # But the user asked for Pizzas & Variants to be flattened OR indexed in search.
            # It's cleaner to keep the schema intact and handle indexing in POS.jsx.
            prod = Product(category=category_name, name=raw_name, is_active=True)
            db.add(prod)
            db.flush()
            
            if isinstance(item[1], list):
                for v in item[1]:
                    var = ProductVariant(product_id=prod.id, variant_name=v[0], base_price=Decimal(str(v[1])))
                    db.add(var)
            else:
                var = ProductVariant(product_id=prod.id, variant_name="Regular", base_price=Decimal(str(item[1])))
                db.add(var)

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_menu()
