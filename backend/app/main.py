"""
POLARIS-X FastAPI Main Application Entrypoint
Operational Decision-Support System for Antarctic Research Vessels
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "POLARIS-X (Polar Operational Logistics, Ice Risk & Intelligent Routing System). "
        "Production-grade decision support platform addressing MoES/NCPOR Problem Statement 26059."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for Next.js frontend (development & production origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "ONLINE",
        "corridor": "Antarctic Peninsula & Weddell Sea",
        "api_docs": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
