from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import os
import json
from typing import Any, Dict

app = FastAPI(
    title="OpenVault Gateway",
    description="FastAPI Gateway for OpenVault AI Security Platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_SAFE_URL = os.getenv("OPENAI_SAFE_URL", "http://openai-safe:8080")

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OPENAI_SAFE_URL}/health")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.post("/api/v1/safety/analyze")
async def analyze_safety(request: Request):
    """Proxy safety analysis requests"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENAI_SAFE_URL}/api/v1/safety/analyze",
                content=body,
                headers=headers,
                timeout=30.0
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/chat/completions")
async def chat_completions(request: Request):
    """Proxy chat completion requests with safety checks"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENAI_SAFE_URL}/api/v1/chat/completions",
                content=body,
                headers=headers,
                timeout=60.0
            )
            
            if "text/event-stream" in response.headers.get("content-type", ""):
                return StreamingResponse(
                    response.aiter_bytes(),
                    media_type="text/event-stream"
                )
            else:
                return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_all(path: str, request: Request):
    """Proxy all other requests to the main service"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                request.method,
                f"{OPENAI_SAFE_URL}/{path}",
                content=body,
                headers=headers,
                timeout=30.0
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 