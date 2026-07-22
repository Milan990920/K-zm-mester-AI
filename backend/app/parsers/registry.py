"""Registry mapping `providers.parser_key` to a `ParserStrategy` instance.

Provider-specific parsers register themselves here as they are built
(docs/03-architektura-terv.md §3.6); unknown/unmapped providers fall back to
`GenericInvoiceParser`.
"""

from app.parsers.base import ParserStrategy
from app.parsers.generic import GenericInvoiceParser

_registry: dict[str, ParserStrategy] = {}


def register_parser(parser: ParserStrategy) -> None:
    _registry[parser.parser_key] = parser


def get_parser(parser_key: str | None) -> ParserStrategy:
    if parser_key and parser_key in _registry:
        return _registry[parser_key]
    return _registry[GenericInvoiceParser.parser_key]


register_parser(GenericInvoiceParser())
