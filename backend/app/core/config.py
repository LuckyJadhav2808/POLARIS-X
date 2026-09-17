"""
POLARIS-X Core Configuration & Operational Settings
"""
from typing import Dict, Tuple
from pydantic import BaseModel, Field

class Settings(BaseModel):
    # System & App Info
    PROJECT_NAME: str = "POLARIS-X"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Golden Demonstration Corridor Bounds
    # Focus: Antarctic Peninsula, Weddell Sea, Scotia Sea / "Iceberg Alley"
    MIN_LAT: float = -78.0
    MAX_LAT: float = -52.0
    MIN_LON: float = -75.0
    MAX_LON: float = -25.0
    
    # 2D Grid Resolution (in decimal degrees ~15-20km per cell)
    GRID_STEP_DEG: float = 0.25
    
    # Default Risk Weightings
    W_ICE: float = 0.45
    W_BERG: float = 0.40
    W_WX: float = 0.15
    
    # Optimization & A* Parameters
    RISK_PENALTY_MULTIPLIER: float = 8.0  # Beta risk
    RISK_AVERSION_EXPONENT: float = 2.0   # Gamma
    ICE_IMPEDANCE_MULTIPLIER: float = 1.5  # Beta ice
    HARD_RISK_THRESHOLD: float = 0.90     # Impassable barrier
    
    # Base Reference Ports & Research Stations
    STATIONS: Dict[str, Tuple[float, float]] = {
        "Rothera Station": (-67.5700, -68.1236),
        "Maitri Station (India)": (-70.7667, 11.7333),
        "Bharati Station (India)": (-69.4075, 76.1872),
        "Dakshin Gangotri (India)": (-70.7500, 11.6333),
        "Halley Station": (-75.4333, -26.2167),
        "Grytviken / South Georgia": (-54.2833, -36.4833),
        "Faraday / Vernadsky": (-65.2500, -64.2667),
        "Deception Island": (-63.0000, -60.7000),
        "Signy Island": (-60.7000, -45.6000),
        "McMurdo Station (USA)": (-77.8500, 166.6667),
        "Casey Station (Australia)": (-66.2833, 110.5333),
        "Davis Station (Australia)": (-68.5767, 77.9672),
        "Mawson Station (Australia)": (-67.6033, 62.8733),
        "Esperanza Base (Argentina)": (-63.3978, -56.9989),
        "Fossil Bluff": (-71.3167, -68.2833),
    }

settings = Settings()
