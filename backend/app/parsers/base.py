"""Parser strategy interface (docs/03-architektura-terv.md §3.6).

A parser does NOT extract field values — it segments the raw text into
logically labelled blocks (header, consumption table, line items, footer...)
so the AI structuring step gets pre-labelled context instead of a flat wall
of text. This keeps the actual value extraction in one place (the AI step)
while letting provider-specific document layouts be handled separately.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class DocumentSegment:
    label: str
    text: str


@dataclass
class ParsedDocument:
    parser_key: str
    segments: list[DocumentSegment] = field(default_factory=list)

    def segment_text(self, label: str) -> str | None:
        for segment in self.segments:
            if segment.label == label:
                return segment.text
        return None


class ParserStrategy(ABC):
    """One implementation per provider-specific invoice layout."""

    parser_key: str

    @abstractmethod
    def parse(self, text: str) -> ParsedDocument: ...
