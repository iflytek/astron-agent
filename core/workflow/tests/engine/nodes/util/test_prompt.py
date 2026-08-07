import pytest

from workflow.engine.nodes.util.prompt import PromptUtils


@pytest.mark.parametrize(
    "template, expected",
    [
        ("{{{input}}}", ["input"]),
        ("{{{{input}}}", ["input"]),
        ("{{input}}", ["input"]),
        # multiple placeholders preserve order
        ("Hello {{user.name}}, id={{user.id}}!", ["user.name", "user.id"]),
        # underscores and hyphens are allowed in names
        ("start {{a_b}} and {{a-b}} end", ["a_b", "a-b"]),
        # numeric-only name is allowed
        ("numbers {{123}}", ["123"]),
        # array indexes (single, nested, negative)
        ("{{arr[0]}}", ["arr[0]"]),
        ("{{arr[0][1]}}", ["arr[0][1]"]),
        ("{{arr[-1]}}", ["arr[-1]"]),
        # dot-separated segments with indexes
        ("{{obj.arr[0].field}}", ["obj.arr[0].field"]),
        # duplicates preserved
        ("{{x}}{{x}}", ["x", "x"]),
        # no placeholders -> empty list
        ("no braces here", []),
    ],
)
def test_valid_and_common_cases(template: str, expected: list[str]) -> None:
    """
    Test valid placeholder formats, order preservation, duplicates, and no-placeholder case.
    """
    result = PromptUtils.get_placeholders(template)
    assert result == expected


@pytest.mark.parametrize(
    "template",
    [
        # spaces inside variable are invalid -> filtered out
        "{{invalid char}}",
        # empty braces -> raw capture is '' which should be filtered
        "{{}}",
        # leading dot or trailing dot invalid segments
        ("{{.start}}"),
        ("{{end.}}"),
        # special characters not allowed
        ("{{name$}}"),
        # brace-like but not matching pattern
        ("{not_double}"),
    ],
)
def test_invalid_placeholders_are_filtered(template: str) -> None:
    """
    Templates containing captures that do not match the allowed variable pattern
    should result in no placeholders (i.e., filtered out).
    """
    result = PromptUtils.get_placeholders(template)
    assert result == []


def test_multiple_mixed_valid_and_invalid_placeholders() -> None:
    """
    When template contains both valid and invalid captures, only valid ones should be returned,
    in the order they appear.
    """
    tpl = "A={{good}}, B={{bad char}}, C={{also_good[0].x}}, D={{.bad}}, E={{123}}"
    # raw matches: ['good','bad char','also_good[0].x','.bad','123']
    # after filtering: ['good','also_good[0].x','123']
    expected = ["good", "also_good[0].x", "123"]
    assert PromptUtils.get_placeholders(tpl) == expected


@pytest.mark.parametrize(
    "template, expected",
    [
        # edge: adjacent braces and text
        ("pre{{a}}mid{{b.c[1]}}post", ["a", "b.c[1]"]),
        # complex but valid name and indices
        ("{{A1_b-2[10][0].x_y-0}}", ["A1_b-2[10][0].x_y-0"]),
    ],
)
def test_complex_valid_expressions(template: str, expected: list[str]) -> None:
    """
    More complex but valid expressions should be accepted.
    """
    assert PromptUtils.get_placeholders(template) == expected
