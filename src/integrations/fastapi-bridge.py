#!/usr/bin/env python3
"""
OpenVault AI Security Platform - FastAPI Integration Bridge

This module provides a FastAPI integration for the OpenVault AI Security Platform,
allowing Python applications to leverage the safety analysis and constitutional AI features.
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
OPENVAULT_BASE_URL = os.getenv("OPENVAULT_BASE_URL", "http://localhost:8080")
OPENVAULT_API_KEY = os.getenv("OPENVAULT_API_KEY", "")

# FastAPI app
app = FastAPI(
    title="OpenVault FastAPI Bridge",
    description="FastAPI integration for OpenVault AI Security Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class SafetyAnalysisRequest(BaseModel):
    text: str = Field(..., description="Text content to analyze for safety")
    mode: Optional[str] = Field("comprehensive", description="Analysis mode")
    include_interpretability: Optional[bool] = Field(False, description="Include interpretability analysis")
    context: Optional[str] = Field(None, description="Additional context for analysis")
    policy_id: Optional[str] = Field(None, description="Specific policy ID to use")

class SafetyAnalysisResponse(BaseModel):
    safe: bool = Field(..., description="Whether the content is safe")
    score: float = Field(..., description="Safety score (0-1)")
    violations: List[Dict[str, Any]] = Field(default_factory=list, description="List of violations found")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Analysis metadata")

class ConstitutionalAIRequest(BaseModel):
    text: str = Field(..., description="Text to apply constitutional principles to")
    principles: Optional[List[str]] = Field(default_factory=lambda: ["harmlessness", "helpfulness"], description="Constitutional principles to apply")
    max_revisions: Optional[int] = Field(3, description="Maximum number of revisions")

class ConstitutionalAIResponse(BaseModel):
    original: str = Field(..., description="Original text")
    revised: str = Field(..., description="Revised text")
    critiques: List[str] = Field(default_factory=list, description="Critiques applied")
    revision_count: int = Field(..., description="Number of revisions made")
    principles: List[str] = Field(default_factory=list, description="Principles applied")
    applied_successfully: bool = Field(..., description="Whether principles were applied successfully")

class ChatCompletionRequest(BaseModel):
    model: str = Field("gpt-4o-mini", description="Model to use")
    messages: List[Dict[str, str]] = Field(..., description="Chat messages")
    safety_mode: Optional[str] = Field("balanced", description="Safety mode")
    temperature: Optional[float] = Field(0.7, description="Temperature for generation")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens to generate")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Health status")
    timestamp: datetime = Field(default_factory=datetime.now, description="Current timestamp")
    openvault_status: str = Field(..., description="OpenVault platform status")

# OpenVault client
class OpenVaultClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict:
        """Make authenticated request to OpenVault API"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, headers=request_headers)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=data, headers=request_headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    
    async def analyze_safety(self, request: SafetyAnalysisRequest) -> SafetyAnalysisResponse:
        """Analyze content for safety violations"""
        data = request.dict(exclude_none=True)
        result = await self._make_request("POST", "/api/v1/safety/analyze", data)
        return SafetyAnalysisResponse(**result)
    
    async def apply_constitutional_ai(self, request: ConstitutionalAIRequest) -> ConstitutionalAIResponse:
        """Apply constitutional AI principles"""
        data = request.dict(exclude_none=True)
        result = await self._make_request("POST", "/api/v1/safety/constitutional", data)
        return ConstitutionalAIResponse(**result)
    
    async def chat_completion(self, request: ChatCompletionRequest) -> Dict:
        """Get safe chat completion"""
        data = request.dict(exclude_none=True)
        result = await self._make_request("POST", "/api/v1/chat/completions", data)
        return result
    
    async def health_check(self) -> Dict:
        """Check OpenVault platform health"""
        return await self._make_request("GET", "/health")

# Initialize client
openvault_client = OpenVaultClient(OPENVAULT_BASE_URL, OPENVAULT_API_KEY)

# Dependency for authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Validate API key (simplified for demo)"""
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return {"user_id": "fastapi_user", "token": credentials.credentials}

# Routes
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "OpenVault FastAPI Bridge",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        openvault_health = await openvault_client.health_check()
        openvault_status = openvault_health.get("status", "unknown")
    except Exception as e:
        logger.warning(f"OpenVault health check failed: {e}")
        openvault_status = "unavailable"
    
    return HealthResponse(
        status="healthy",
        openvault_status=openvault_status
    )

@app.post("/safety/analyze", response_model=SafetyAnalysisResponse)
async def analyze_safety(
    request: SafetyAnalysisRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Analyze content for safety violations"""
    logger.info(f"Safety analysis requested by user {current_user['user_id']}")
    return await openvault_client.analyze_safety(request)

@app.post("/safety/constitutional", response_model=ConstitutionalAIResponse)
async def apply_constitutional_ai(
    request: ConstitutionalAIRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Apply constitutional AI principles to content"""
    logger.info(f"Constitutional AI requested by user {current_user['user_id']}")
    return await openvault_client.apply_constitutional_ai(request)

@app.post("/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Get safe chat completion"""
    logger.info(f"Chat completion requested by user {current_user['user_id']}")
    return await openvault_client.chat_completion(request)

@app.get("/policies")
async def list_policies(current_user: Dict = Depends(get_current_user)):
    """List available safety policies"""
    return await openvault_client._make_request("GET", "/api/v1/policies")

# Batch processing endpoint
@app.post("/safety/analyze/batch")
async def analyze_safety_batch(
    requests: List[SafetyAnalysisRequest],
    current_user: Dict = Depends(get_current_user)
):
    """Batch safety analysis"""
    logger.info(f"Batch safety analysis requested by user {current_user['user_id']} for {len(requests)} items")
    
    tasks = [openvault_client.analyze_safety(req) for req in requests]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results and handle exceptions
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append({
                "index": i,
                "error": str(result),
                "safe": False,
                "score": 0.0,
                "violations": [],
                "metadata": {"error": True}
            })
        else:
            processed_results.append({
                "index": i,
                **result.dict()
            })
    
    return {"results": processed_results}

# WebSocket endpoint for real-time safety monitoring
@app.websocket("/ws/safety")
async def websocket_safety_monitor(websocket):
    """WebSocket endpoint for real-time safety monitoring"""
    await websocket.accept()
    logger.info("WebSocket connection established for safety monitoring")
    
    try:
        while True:
            # Wait for incoming message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "analyze":
                # Perform safety analysis
                request = SafetyAnalysisRequest(**message.get("data", {}))
                result = await openvault_client.analyze_safety(request)
                
                # Send result back
                await websocket.send_text(json.dumps({
                    "type": "analysis_result",
                    "data": result.dict(),
                    "timestamp": datetime.now().isoformat()
                }))
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("WebSocket connection closed")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("OpenVault FastAPI Bridge starting up...")
    
    # Test connection to OpenVault
    try:
        health = await openvault_client.health_check()
        logger.info(f"Connected to OpenVault: {health.get('status', 'unknown')}")
    except Exception as e:
        logger.warning(f"Could not connect to OpenVault: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown"""
    logger.info("OpenVault FastAPI Bridge shutting down...")
    await openvault_client.client.aclose()

if __name__ == "__main__":
    # Run the FastAPI application
    uvicorn.run(
        "fastapi-bridge:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 