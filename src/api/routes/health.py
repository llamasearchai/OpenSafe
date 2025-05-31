@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "OpenSafe"} 