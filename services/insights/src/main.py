from fastapi import FastAPI
from sqlalchemy import text

from shared.errors import register_domain_errors

from .api.insights import router
from .db import engine

app = FastAPI(title="Insights service")
register_domain_errors(app)
app.include_router(router)


@app.get("/health")
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}
