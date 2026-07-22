"""Deterministic provider identification (docs/03-architektura-terv.md §3.4,
first pass). Only decides *which known provider* issued the document — never
extracts invoice field values, which remains the AI structuring step's job.
"""

import re
from dataclasses import dataclass

from app.models.provider import Provider

# Below this, we don't trust a single keyword match enough to auto-assign the
# provider — callers should fall back to AI classification instead.
MIN_CONFIDENT_MATCHES = 1


@dataclass
class ProviderMatch:
    provider: Provider
    matched_patterns: list[str]

    @property
    def confidence(self) -> float:
        # More independent pattern hits (name, tax number, header strings) on
        # the same provider raise our confidence that this isn't a coincidence.
        return min(1.0, 0.5 + 0.25 * len(self.matched_patterns))


def classify_provider_by_text(text: str, providers: list[Provider]) -> ProviderMatch | None:
    """Matches known providers' `detection_patterns` against extracted text.

    `detection_patterns` is expected to be a dict like:
        {"aliases": ["E.ON Energiakereskedelmi", "E.ON"], "tax_numbers": ["12345678-2-44"]}
    """
    normalized_text = _normalize(text)

    best_match: ProviderMatch | None = None
    for provider in providers:
        patterns = provider.detection_patterns or {}
        matched: list[str] = []

        for alias in patterns.get("aliases", []):
            if _normalize(alias) in normalized_text:
                matched.append(alias)

        for tax_number in patterns.get("tax_numbers", []):
            if _normalize(tax_number) in normalized_text:
                matched.append(tax_number)

        if len(matched) < MIN_CONFIDENT_MATCHES:
            continue

        candidate = ProviderMatch(provider=provider, matched_patterns=matched)
        if best_match is None or candidate.confidence > best_match.confidence:
            best_match = candidate

    return best_match


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()
