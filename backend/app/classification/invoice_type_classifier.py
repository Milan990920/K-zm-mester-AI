"""Keyword-based invoice type *signals* (docs/03-architektura-terv.md §3.5).

These are deliberately signals, not verdicts — they narrow down candidates
and feed the AI structuring step as context, they never single-handedly
decide the final `invoice_type`. Order matters: more specific types are
checked before the generic `commercial` fallback.
"""

import re

from app.models.enums import InvoiceType

_KEYWORD_PATTERNS: list[tuple[InvoiceType, list[str]]] = [
    (InvoiceType.STORNO, [r"sztorn[oó]", r"storno"]),
    (InvoiceType.CORRECTION, [r"helyesbít[oő]\s+sz[aá]mla"]),
    (InvoiceType.NETWORK_USAGE_FEE, [r"rendszerhaszn[aá]lati\s+d[ií]j", r"\brhd\b"]),
    (InvoiceType.CAPACITY_FEE, [r"teljes[ií]tm[eé]ny\s*d[ií]j"]),
    (InvoiceType.SETTLEMENT, [r"elsz[aá]mol[oó]\s+sz[aá]mla"]),
    (InvoiceType.PARTIAL, [r"r[eé]szsz[aá]mla"]),
]


def suggest_invoice_types(text: str) -> list[InvoiceType]:
    """Returns candidate invoice types found via keyword signals, most
    specific first. An empty list means: no strong keyword signal, defer
    entirely to AI classification (commercial is the eventual default there).
    """
    normalized = text.lower()
    matches = [
        invoice_type
        for invoice_type, patterns in _KEYWORD_PATTERNS
        if any(re.search(pattern, normalized) for pattern in patterns)
    ]
    return matches
