import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # AI Gateway
    GATEWAY_BASE_URL: str = "https://gateway.letsur.ai/v1"
    GATEWAY_API_KEY: str = os.getenv("GATEWAY_API_KEY", "sk-bYiwDrh0F0wmHZhxq72sfA")

    # Gemini models via gateway
    TEXT_MODEL: str = "gemini-2.5-flash"
    AGENT_MODEL: str = "gemini-3-pro-preview"  # Director/Scenario agents (Gemini 3.1 Pro)
    IMAGE_MODEL: str = "gemini-3-pro-image-preview"

    # fal.ai (Veo 3.1)
    FAL_API_KEY: str = os.getenv(
        "FAL_API_KEY",
        "d8940731-42dc-4ef8-a8f6-edf63cbbd0ca:043429ebd41f63d9fb404e8620ba6fde",
    )

    # Suno API (BGM generation)
    SUNO_API_KEY: str = os.getenv("SUNO_API_KEY", "")
    SUNO_API_BASE: str = "https://api.sunoapi.org"
    SUNO_MODEL: str = "V4_5"
    SUNO_CALLBACK_URL: str = os.getenv("SUNO_CALLBACK_URL", "")

    # Teaser MV settings
    TEASER_SCENE_COUNT: int = 4
    TEASER_SCENE_DURATION: str = "8s"
    TEASER_ASPECT_RATIO: str = "9:16"

    # App
    MAX_MEMBERS: int = 3


settings = Settings()
