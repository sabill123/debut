"""Shared AsyncOpenAI client singleton for AI Gateway.

Used by both agents (base_agent.py) and services (gateway_client.py)
to avoid duplicate client instances and circular imports.
"""

from openai import AsyncOpenAI

from src.config import settings

_client: AsyncOpenAI | None = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.GATEWAY_BASE_URL,
            api_key=settings.GATEWAY_API_KEY,
        )
    return _client
