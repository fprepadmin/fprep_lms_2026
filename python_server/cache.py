import time
from typing import Any, Optional, Dict
import asyncio

class InMemoryTTLCache:
    def __init__(self, default_ttl_seconds: int = 120):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = default_ttl_seconds
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._cache.get(key)
            if not entry:
                self._misses += 1
                return None
            
            now = time.time()
            if now > entry["expires_at"]:
                # Đã hết hạn TTL
                del self._cache[key]
                self._misses += 1
                return None
            
            self._hits += 1
            return entry["value"]

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        async with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": time.time() + ttl,
                "created_at": time.time()
            }

    async def delete(self, key: str):
        async with self._lock:
            if key in self._cache:
                del self._cache[key]

    async def clear(self):
        async with self._lock:
            self._cache.clear()

    async def get_stats(self) -> Dict[str, Any]:
        async with self._lock:
            now = time.time()
            active_keys = sum(1 for e in self._cache.values() if e["expires_at"] > now)
            total_reqs = self._hits + self._misses
            hit_rate = (self._hits / total_reqs * 100) if total_reqs > 0 else 0.0
            return {
                "total_cached_items": len(self._cache),
                "active_items": active_keys,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 2)
            }

# Global singleton cache instance
cache = InMemoryTTLCache(default_ttl_seconds=180)
