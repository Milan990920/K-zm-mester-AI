"""Fallback parser for providers without a dedicated layout-specific parser.

Segments the text heuristically by common Hungarian utility-invoice section
headers. Deliberately conservative: an unmatched document just ends up as a
single `body` segment, which downstream AI structuring can still work with,
just with a lower expected confidence (see docs/03-architektura-terv.md §3.6).
"""

import re

from app.parsers.base import DocumentSegment, ParsedDocument, ParserStrategy

_SECTION_HEADERS: list[tuple[str, str]] = [
    ("consumption", r"fogyaszt[aá]si\s+adatok"),
    ("meter_reading", r"m[eé]r[oő][aá]ll[aá]s"),
    ("line_items", r"(tétel(ek)?|megnevez[eé]s).{0,20}(mennyis[eé]g|nett[oó])"),
    ("payment", r"fizet[eé]si\s+(felt[eé]telek|hat[aá]rid[oő])"),
    ("footer", r"k[eé]szítette|ny(o|0)mtatv[aá]ny\s+sz[aá]ma"),
]


class GenericInvoiceParser(ParserStrategy):
    parser_key = "generic_invoice_parser_v1"

    def parse(self, text: str) -> ParsedDocument:
        boundaries = self._find_section_boundaries(text)

        if not boundaries:
            return ParsedDocument(
                parser_key=self.parser_key,
                segments=[DocumentSegment(label="body", text=text)],
            )

        segments = []
        if boundaries[0][1] > 0:
            segments.append(DocumentSegment(label="header", text=text[: boundaries[0][1]]))

        for i, (label, start) in enumerate(boundaries):
            end = boundaries[i + 1][1] if i + 1 < len(boundaries) else len(text)
            segments.append(DocumentSegment(label=label, text=text[start:end]))

        return ParsedDocument(parser_key=self.parser_key, segments=segments)

    @staticmethod
    def _find_section_boundaries(text: str) -> list[tuple[str, int]]:
        boundaries: list[tuple[str, int]] = []
        for label, pattern in _SECTION_HEADERS:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                boundaries.append((label, match.start()))
        boundaries.sort(key=lambda item: item[1])
        return boundaries
