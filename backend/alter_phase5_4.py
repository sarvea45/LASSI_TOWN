from sqlalchemy import create_engine, text
engine = create_engine('postgresql+psycopg2://lassi_user:lassi_password@db:5432/lassitown')
with engine.connect() as con:
    con.execute(text('ALTER TABLE "Orders" ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL'))
    con.execute(text('ALTER TABLE "Orders" ADD COLUMN is_nc BOOLEAN DEFAULT FALSE NOT NULL'))
    con.commit()
print("Done")
