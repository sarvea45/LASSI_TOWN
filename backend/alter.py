from sqlalchemy import create_engine, text
engine = create_engine('postgresql+psycopg2://lassi_user:lassi_password@db:5432/lassitown')
with engine.connect() as con:
    con.execute(text('ALTER TABLE "Orders" ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL'))
    con.commit()
print("Done")
