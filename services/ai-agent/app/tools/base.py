"""Base class for tools with common lifecycle methods."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """Abstract base class for tools. Provides name, description, and execution."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Any: ...

    def validate(self, **kwargs: Any) -> bool:
        return True
