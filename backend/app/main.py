from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth_router, menu_router, shift_router, order_router, reports_router

app = FastAPI(title="Lassi Town POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(menu_router.router)
app.include_router(shift_router.router)
app.include_router(order_router.router)
app.include_router(reports_router.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to Lassi Town POS API"}
