"""Base agent with shared LLM calling logic via AI Gateway."""

import json
import logging
from abc import ABC, abstractmethod

from src.config import settings
from src.services.llm_client import get_llm_client

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Base class for all agents. Provides LLM calling and JSON parsing."""

    name: str = "base"
    model: str = settings.AGENT_MODEL

    @abstractmethod
    def system_prompt(self) -> str:
        ...

    async def call_llm(
        self,
        user_prompt: str,
        *,
        temperature: float = 0.85,
        max_tokens: int = 8000,
        json_mode: bool = True,
    ) -> dict:
        """Call LLM via AI Gateway and return parsed JSON."""
        client = get_llm_client()

        kwargs: dict = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.system_prompt()},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        logger.info("[%s] Calling LLM (%s)...", self.name, self.model)
        response = await client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content

        if json_mode:
            return json.loads(text)
        return {"text": text}

    async def call_llm_text(
        self,
        user_prompt: str,
        *,
        temperature: float = 0.85,
        max_tokens: int = 4000,
    ) -> str:
        """Call LLM and return raw text."""
        result = await self.call_llm(
            user_prompt, temperature=temperature, max_tokens=max_tokens, json_mode=False
        )
        return result["text"]
