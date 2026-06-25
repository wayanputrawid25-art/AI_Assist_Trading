# Robot Deployment Checklist

MT5 Trading Robot architecture audit for ForexOS.

---

## Executive Summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 5 |
| ⚠️ Incomplete | 4 |
| 🔴 Not Implemented | 6 |
| ❌ Not Applicable | 2 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ForexOS Robot                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    main.py                           │   │
│  │              (Entry Point)                          │   │
│  └──────────┬──────────────────┬───────────────────────┘   │
│             │                  │                              │
│  ┌─────────▼────┐  ┌─────────▼──────┐  ┌────────────────┐  │
│  │   MT5        │  │    API         │  │    Risk        │  │
│  │  Connector   │  │   Client       │  │   Manager      │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
    ┌──────────┐      ┌──────────┐         ┌──────────┐
    │   MT5    │      │  Backend  │         │  Config  │
    │ Terminal │      │    API    │         │   YAML   │
    └──────────┘      └──────────┘         └──────────┘
```

---

## 1. Python Environment

### ✅ Dependencies

```toml
# pyproject.toml
[tool.poetry.dependencies]
python = "^3.11"
MetaTrader5 = "^5.0.45"
numpy = "^1.26.0"
pandas = "^2.2.0"
pydantic = "^2.6.0"
python-dotenv = "^1.0.0"
httpx = "^0.27.0"
redis = "^5.0.0"
loguru = "^0.7.0"
```

### ✅ Development Tools

| Tool | Purpose |
|------|---------|
| pytest | Unit testing |
| pytest-cov | Coverage |
| ruff | Linting |
| mypy | Type checking |
| black | Formatting |

### ⚠️ Missing Dependency

**Issue:** `pydantic-settings` not in dependencies

```toml
# Current - MISSING
pydantic = "^2.6.0"

# Should add
pydantic-settings = "^2.1.0"  # For BaseSettings
```

---

## 2. MT5 Connection

### 🔴 Status: NOT IMPLEMENTED

```python
# robot/src/connectors/mt5_connector.py
class MT5Connector:
    async def connect(self) -> bool:
        logger.info("Connecting to MT5...")
        # TODO: Implement MT5 connection
        return True
    
    async def get_account_info(self) -> dict:
        # TODO: Implement
        return {}
    
    async def get_positions(self) -> list:
        # TODO: Implement
        return []
```

### Required Implementation

```python
import MetaTrader5 as mt5

class MT5Connector:
    async def connect(self) -> bool:
        """Connect to MT5 terminal."""
        if not mt5.initialize():
            logger.error(f"MT5 init failed: {mt5.last_error()}")
            return False
        
        # Login to account
        if not mt5.login(
            login=settings.mt5_login,
            password=settings.mt5_password,
            server=settings.mt5_server
        ):
            logger.error(f"MT5 login failed: {mt5.last_error()}")
            return False
        
        logger.info(f"Connected to MT5 account {settings.mt5_login}")
        return True
    
    async def get_positions(self) -> list:
        """Get all open positions."""
        positions = mt5.positions_get()
        return positions if positions else []
    
    async def get_account_info(self) -> dict:
        """Get account information."""
        info = mt5.account_info()
        return {
            "balance": info.balance,
            "equity": info.equity,
            "margin": info.margin,
            "margin_level": info.margin_level,
        }
```

---

## 3. API Communication

### 🔴 Status: NOT IMPLEMENTED

No HTTP client for backend communication.

### Required Implementation

```python
# robot/src/services/api_client.py
import httpx
from typing import Optional

class APIClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            headers={"X-API-Key": api_key},
            timeout=30.0
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def sync_positions(self, positions: list) -> bool:
        """Sync positions to backend."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/robot/sync",
            json={"positions": positions}
        )
        return response.status_code == 200
    
    async def get_orders(self) -> list:
        """Get pending orders from backend."""
        response = await self.client.get(
            f"{self.base_url}/api/v1/robot/orders"
        )
        return response.json().get("data", [])
```

---

## 4. Authentication

### ⚠️ Status: INCOMPLETE

**Current State:**
- API key defined in settings
- No validation or refresh mechanism

```python
# robot/src/config/settings.py
api_key: str = Field(default="", description="API key for authentication")
```

### Required Implementation

```python
# Validate API key on startup
async def validate_api_key(client: APIClient) -> bool:
    """Validate API key with backend."""
    try:
        response = await client.client.get(
            f"{client.base_url}/api/v1/robot/validate"
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"API validation failed: {e}")
        return False

# Rotate key if needed
async def refresh_api_key(client: APIClient) -> Optional[str]:
    """Refresh API key if expired."""
    # Implementation for key rotation
    pass
```

---

## 5. Heartbeat

### 🔴 Status: NOT IMPLEMENTED

No heartbeat mechanism for backend communication.

### Required Implementation

```python
# robot/src/services/heartbeat.py
import asyncio
from datetime import datetime

class HeartbeatService:
    def __init__(self, api_client: APIClient, interval: int = 30):
        self.api_client = api_client
        self.interval = interval
        self._running = False
    
    async def start(self):
        """Start heartbeat loop."""
        self._running = True
        while self._running:
            try:
                await self.send_heartbeat()
            except Exception as e:
                logger.error(f"Heartbeat failed: {e}")
            await asyncio.sleep(self.interval)
    
    async def send_heartbeat(self):
        """Send heartbeat to backend."""
        response = await self.api_client.client.post(
            f"{self.api_client.base_url}/api/v1/robot/heartbeat",
            json={
                "timestamp": datetime.utcnow().isoformat(),
                "status": "online",
            }
        )
        if response.status_code != 200:
            logger.warning("Heartbeat not acknowledged")
    
    def stop(self):
        """Stop heartbeat."""
        self._running = False
```

---

## 6. Order Execution

### 🔴 Status: NOT IMPLEMENTED

```python
# robot/src/connectors/mt5_connector.py
async def send_order(self, order: dict) -> dict:
    """Send trading order."""
    # TODO: Implement
    return {"ticket": 0, "retcode": 0}
```

### Required Implementation

```python
import MetaTrader5 as mt5
from typing import Optional

class MT5Connector:
    async def send_order(
        self,
        symbol: str,
        order_type: str,
        volume: float,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> dict:
        """Send trading order to MT5."""
        # Prepare request
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": mt5.ORDER_TYPE_BUY if order_type == "buy" else mt5.ORDER_TYPE_SELL,
            "price": price,
            "deviation": 10,
            "magic": 234000,  # Robot magic number
            "comment": "ForexOS Robot",
        }
        
        if stop_loss:
            request["sl"] = stop_loss
        if take_profit:
            request["tp"] = take_profit
        
        # Send order
        result = mt5.order_send(request)
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            logger.error(f"Order failed: {result.comment}")
            return {"success": False, "error": result.comment}
        
        logger.info(f"Order placed: {result.order}")
        return {
            "success": True,
            "ticket": result.order,
            "retcode": result.retcode
        }
```

---

## 7. Risk Synchronization

### 🔴 Status: NOT IMPLEMENTED

No risk management sync with backend.

### Required Implementation

```python
# robot/src/risk/synchronizer.py
class RiskSynchronizer:
    def __init__(self, api_client: APIClient, mt5: MT5Connector):
        self.api_client = api_client
        self.mt5 = mt5
    
    async def sync_risk(self) -> dict:
        """Sync risk settings from backend."""
        response = await self.api_client.client.get(
            f"{self.api_client.base_url}/api/v1/robot/risk"
        )
        risk_settings = response.json().get("data", {})
        
        return {
            "max_risk_percent": risk_settings.get("maxRiskPercent", 1.0),
            "max_positions": risk_settings.get("maxPositions", 5),
            "max_daily_loss": risk_settings.get("maxDailyLoss", 100),
        }
    
    async def validate_trade(self, trade: dict, risk: dict) -> bool:
        """Validate trade against risk settings."""
        positions = await self.mt5.get_positions()
        
        # Check max positions
        if len(positions) >= risk["max_positions"]:
            logger.warning("Max positions reached")
            return False
        
        # Check daily loss
        daily_pnl = sum(p.profit for p in positions)
        if daily_pnl < -risk["max_daily_loss"]:
            logger.warning("Daily loss limit reached")
            return False
        
        return True
```

---

## 8. Configuration Loading

### ✅ Status: IMPLEMENTED

```python
# robot/src/config/settings.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # MT5 Settings
    mt5_login: int = Field(default=0)
    mt5_password: str = Field(default="")
    mt5_server: str = Field(default="")
    
    # API
    api_url: str = Field(default="http://localhost:3001")
    api_key: str = Field(default="")
    
    # Risk
    max_risk_percent: float = Field(default=1.0)
    max_positions: int = Field(default=5)
```

### ⚠️ Configuration Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| `pydantic-settings` not installed | HIGH | Add to dependencies |
| No validation for required fields | MEDIUM | Add validation |
| No env file existence check | LOW | Add `.env.example` check |

---

## 9. Deployment

### ✅ Dockerfile

```dockerfile
# Dockerfile.robot
FROM python:3.11-slim

# Install MT5 dependencies
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libsm6 libxext6 \
    libxrender1 libgomp1 fonts-liberation

# Install Python deps
RUN pip install poetry
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-interaction

COPY src/ ./src/
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "src.main"]
```

### ⚠️ Missing Docker Compose

Add to `docker-compose.yml`:

```yaml
robot:
  build:
    context: ./robot
    dockerfile: Dockerfile.robot
  environment:
    - MT5_LOGIN=${MT5_LOGIN}
    - MT5_PASSWORD=${MT5_PASSWORD}
    - MT5_SERVER=${MT5_SERVER}
    - API_URL=${API_URL}
    - API_KEY=${API_KEY}
  volumes:
    - robot_data:/app/data
  depends_on:
    - api
  restart: unless-stopped
```

---

## 10. Checklist Summary

### ✅ Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| Python Environment | ✅ | pyproject.toml with Poetry |
| Configuration | ✅ | Pydantic settings |
| Logging | ✅ | Loguru configured |
| Docker | ✅ | Dockerfile ready |
| Project Structure | ✅ | Services, connectors, risk |

### ⚠️ Incomplete

| Component | Status | Notes |
|-----------|--------|-------|
| MT5 Connection | ⚠️ | Skeleton only |
| API Client | ⚠️ | Not implemented |
| Authentication | ⚠️ | Key exists, no validation |
| Configuration | ⚠️ | Missing pydantic-settings |

### 🔴 Not Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| MT5 Connect | 🔴 | Needs MetaTrader5.init() |
| MT5 Order Execution | 🔴 | Needs order_send() |
| Heartbeat | 🔴 | No keep-alive |
| Risk Sync | 🔴 | No backend sync |
| Order Sync | 🔴 | No position sync |
| Error Handling | 🔴 | No retry logic |

---

## 11. Implementation Priority

### Phase 1: Core Connection

1. Add `pydantic-settings` to dependencies
2. Implement MT5 connection
3. Add heartbeat mechanism

### Phase 2: Data Sync

4. Implement API client
5. Sync positions to backend
6. Fetch orders from backend

### Phase 3: Trading

7. Implement order execution
8. Add risk validation
9. Error handling & retries

---

## 12. Environment Variables

### Required for Robot

| Variable | Description | Example |
|----------|-------------|---------|
| `MT5_LOGIN` | MT5 Account ID | `12345678` |
| `MT5_PASSWORD` | MT5 Password | `secret` |
| `MT5_SERVER` | MT5 Server | `ICMarkets-Demo` |
| `MT5_PATH` | Terminal Path | `C:\Program Files\...` |
| `API_URL` | Backend URL | `http://api:3001` |
| `API_KEY` | Auth Key | `forexos-api-key` |
| `DATABASE_URL` | Database | `postgresql://...` |
| `REDIS_URL` | Redis | `redis://redis:6379` |
| `LOG_LEVEL` | Log Level | `INFO` |

---

## 13. Next Steps

1. **Add Missing Dependency**
   ```bash
   # pyproject.toml
   pydantic-settings = "^2.1.0"
   ```

2. **Implement MT5 Connector**
   - Initialize terminal
   - Login to account
   - Get positions/info

3. **Create API Client**
   - HTTP client setup
   - Authentication header
   - Error handling

4. **Add Heartbeat Service**
   - Periodic ping to backend
   - Status updates

5. **Implement Risk Sync**
   - Fetch risk settings
   - Validate trades

6. **Add Order Execution**
   - Send orders to MT5
   - Sync confirmations

---

*Last updated: 2026-06-24*
