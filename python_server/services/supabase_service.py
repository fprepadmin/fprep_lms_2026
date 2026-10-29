import httpx
from typing import List, Dict, Any, Optional
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

class SupabaseAsyncService:
    def __init__(self):
        self.base_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=httpx.Timeout(10.0, connect=5.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
            )
        return self._client

    async def select(self, table: str, query_params: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        client = await self.get_client()
        try:
            resp = await client.get(f"/{table}", params=query_params or {})
            if resp.status_code == 200:
                return resp.json()
            else:
                print(f"[SupabaseService] Query error {resp.status_code}: {resp.text}")
                return []
        except Exception as e:
            print(f"[SupabaseService] Exception querying {table}: {e}")
            return []

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

supabase_service = SupabaseAsyncService()
