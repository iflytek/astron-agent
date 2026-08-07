"""
Audit system utility functions and text processing helpers.

This module provides utility functions for text processing, sentence parsing,
and content manipulation used throughout the audit system.
"""

import re
from typing import Tuple

# Ending punctuation marks that indicate sentence completion
END_SYMBOLS = [
    "\n",
    "\n\n",  # Line breaks
    "。",
    ".",  # Period
    "！",
    "!",  # Exclamation mark
    "？",
    "?",  # Question mark
    "；",
    ";",  # Semicolon
]

# Non-ending punctuation symbols that don't indicate sentence completion
NON_END_SYMBOLS = [
    "，",
    ",",  # Comma
    "：",
    ":",  # Colon
    "、",  # Chinese enumeration comma
    "》",  # Chinese quotation mark
    ")",
    "）",  # Parentheses
    "】",
    "]",  # Square brackets
    "}",  # Curly braces
    "……",  # Ellipsis
]

# Compiled regex pattern for matching ending symbols
END_SYMBOLS_PATTERN = re.compile(
    rf'.+?(?:{"|".join(map(re.escape, END_SYMBOLS))})', re.DOTALL
)

# Set of non-ending symbols for efficient lookup
NON_END_SYMBOL_SET = set(NON_END_SYMBOLS)

# Maximum sentence length threshold for fallback splitting
MAX_SENTENCE_LEN = 50
# Special value indicating all content should be treated as one sentence
ALL_SENTENCE_LEN = -1


class Sentence:
    """
    Utility class for processing text content sentences.

    This class provides static methods for intelligent sentence parsing and
    text segmentation, supporting both Chinese and English punctuation patterns.
    """

    @staticmethod
    def find_valid_sentence(
        content: str, fallback_length: int = MAX_SENTENCE_LEN
    ) -> tuple[list[str], str]:
        """
        Find the first valid sentence in the text using intelligent parsing.

        This method attempts to find complete sentences by following a priority order:
        1. Split by ending punctuation marks (periods, exclamation marks, etc.)
        2. If no complete sentences found, split by non-ending punctuation (commas, etc.)
        3. As a fallback, return the first N characters

        :param content: Text content to process and segment
        :param fallback_length: Maximum length for fallback sentence splitting
        :return: Tuple containing (list of first sentences, remaining text)
        """

        # Initialize result containers
        sentences: list[str] = []
        remaining = ""

        # Handle empty content
        if not content:
            return sentences, ""

        # Handle special case where all content should be treated as one sentence
        if fallback_length == ALL_SENTENCE_LEN:
            return [content], ""

        # Step 1: Try to split by ending punctuation to find complete sentences
        sentences, remaining = Sentence._extract_first_end_symbol(
            content, fallback_length
        )
        if sentences:
            return sentences, remaining

        # Step 2: If no complete sentences found, split by non-ending punctuation
        sentence, remaining = Sentence._extract_before_last_non_end_symbol(
            content, fallback_length
        )
        if sentence:
            sentences.append(sentence)
            return sentences, remaining

        # Step 3: Fallback - return first N characters as a single sentence
        first_sentence = (
            content[:fallback_length]
            if fallback_length != ALL_SENTENCE_LEN
            else content
        )
        remaining = (
            content[fallback_length:] if fallback_length != ALL_SENTENCE_LEN else ""
        )
        sentences.append(first_sentence)
        return sentences, remaining

    @staticmethod
    def _extract_first_end_symbol(
        text: str, fallback_length: int = MAX_SENTENCE_LEN
    ) -> Tuple[list, str]:
        """
        Extract sentences from text by finding sentences ending with punctuation marks.

        This method uses regex pattern matching to identify complete sentences
        that end with proper punctuation marks, respecting the fallback length limit.

        :param text: Text content to extract sentences from
        :param fallback_length: Maximum length for sentence extraction
        :return: Tuple containing (list of extracted sentences, remaining text)
        """

        # Find all sentences ending with punctuation marks
        sentences_temp = END_SYMBOLS_PATTERN.findall(text)
        sentences = []

        # Apply length constraints if fallback_length is specified
        if fallback_length != ALL_SENTENCE_LEN:
            one = ""
            for i, s in enumerate(sentences_temp):
                if len(one) + len(s) <= fallback_length:
                    one += s
                else:
                    if one:
                        sentences.append(one)
                    one = s
            if one:
                sentences.append(one)

        matched_len = sum(len(s) for s in sentences)
        remainder = text[matched_len:]
        return sentences, remainder

    @staticmethod
    def _extract_before_last_non_end_symbol(
        text: str, fallback_length: int = MAX_SENTENCE_LEN
    ) -> Tuple[str, str]:
        """
        Extract content before the last non-ending punctuation symbol.

        This method searches backwards through the text to find the last occurrence
        of non-ending punctuation and splits the text at that point.

        :param text: Text content to process and split
        :param fallback_length: Maximum length for text processing
        :return: Tuple containing (prefix text with symbol, remaining text)
        """
        # Get maximum symbol length for efficient searching
        max_len = max(len(sym) for sym in NON_END_SYMBOLS)
        need_deal_text = (
            text[:fallback_length] if fallback_length != ALL_SENTENCE_LEN else text
        )

        # Search backwards through the text for non-ending symbols
        for i in range(len(need_deal_text) - 1, -1, -1):
            for ll in range(1, max_len + 1):
                start = i - ll + 1
                if start < 0:
                    continue
                symbol = need_deal_text[start : i + 1]
                if symbol in NON_END_SYMBOL_SET:
                    # Split text at the found symbol
                    sentence = need_deal_text[: i + 1]
                    remaining = text[len(sentence) :]
                    return sentence, remaining

        # No non-ending symbols found
        return "", ""

    @staticmethod
    def has_end_symbol(text: str) -> bool:
        """
        Check if text contains any ending punctuation symbols.

        This method performs a simple check to determine if the given text
        contains any of the defined ending punctuation marks.

        :param text: Text content to check for ending punctuation
        :return: True if text contains ending punctuation, False otherwise
        """
        return any(sym in text for sym in END_SYMBOLS)

    @staticmethod
    def split_and_keep_delimiters(text: str, separators: list[str]) -> list[str]:
        """
        Split text while preserving delimiter characters.

        This method splits the input text at specified separator characters
        while keeping the separators attached to the preceding text segments.

        :param text: Text content to split
        :param separators: List of separator characters to split on
        :return: List of text segments with delimiters preserved
        """
        result = []
        current = ""

        # Process each character in the text
        for char in text:
            if char in separators:
                # When encountering a separator, add current string plus separator to result
                result.append(current + char)
                current = ""  # Reset current string for next segment
            else:
                current += char  # Continue building current string

        # Add any remaining content as the final segment
        if current:
            result.append(current)

        return result
