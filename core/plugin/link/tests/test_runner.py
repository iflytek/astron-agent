#!/usr/bin/env python3
"""
Test Runner for Spark Link Plugin

This script provides convenient commands for running different types of tests:
- Unit tests: Test individual functions and classes in isolation
- Integration tests: Test component interactions and workflows
- Coverage reports: Generate test coverage analysis
"""

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List


class TestRunner:
    """Test runner for Spark Link plugin"""

    def __init__(self) -> None:
        self.project_root = Path(__file__).parent.parent
        self.tests_dir = self.project_root / "tests"

    def run_command(self, cmd: List[str], quiet: bool = False) -> int:
        """Run a command and return exit code"""
        if not quiet:
            print(f"Running: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd, cwd=self.project_root, capture_output=quiet, text=True
            )

            if quiet and result.returncode != 0:
                print(f"Command failed: {' '.join(cmd)}")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}")

            return result.returncode
        except Exception as e:
            print(f"Error running command: {e}")
            return 1

    def run_all_tests(self, no_coverage: bool = False, quiet: bool = False) -> int:
        """Run all tests with optional coverage"""
        cmd = ["python", "-m", "pytest", "tests/"]

        if not no_coverage:
            cmd.extend(
                [
                    "--cov=plugin.link",
                    "--cov-report=html:htmlcov",
                    "--cov-report=term-missing",
                    "--cov-report=xml",
                    "--cov-fail-under=80",
                ]
            )

        if quiet:
            cmd.append("-q")
        else:
            cmd.extend(["-v", "--tb=short"])

        # Add no-coverage option if specified
        if no_coverage:
            cmd.append("--no-cov")

        return self.run_command(cmd, quiet)

    def run_unit_tests(self, quiet: bool = False) -> int:
        """Run only unit tests"""
        cmd = ["python", "-m", "pytest", "tests/unit/", "-m", "unit"]

        if quiet:
            cmd.append("-q")
        else:
            cmd.extend(["-v", "--tb=short"])

        return self.run_command(cmd, quiet)

    def run_integration_tests(self, quiet: bool = False) -> int:
        """Run only integration tests"""
        cmd = ["python", "-m", "pytest", "tests/integration/", "-m", "integration"]

        if quiet:
            cmd.append("-q")
        else:
            cmd.extend(["-v", "--tb=short"])

        return self.run_command(cmd, quiet)

    def run_specific_test(self, test_path: str, quiet: bool = False) -> int:
        """Run a specific test file or function"""
        cmd = ["python", "-m", "pytest", test_path]

        if quiet:
            cmd.append("-q")
        else:
            cmd.extend(["-v", "--tb=short"])

        return self.run_command(cmd, quiet)

    def check_coverage(self, quiet: bool = False) -> int:
        """Generate coverage report"""
        cmd = [
            "python",
            "-m",
            "pytest",
            "tests/",
            "--cov=plugin.link",
            "--cov-report=html:htmlcov",
            "--cov-report=term-missing",
            "--cov-report=xml",
            "--cov-fail-under=80",
        ]

        if quiet:
            cmd.append("-q")

        return self.run_command(cmd, quiet)

    def generate_report(self, quiet: bool = False) -> int:
        """Generate comprehensive test report"""
        print("🧪 Generating comprehensive test report...")

        # Run tests with coverage
        exit_code = self.check_coverage(quiet)

        if exit_code == 0:
            print("✅ Test report generated successfully!")
            print(f"📊 HTML coverage report: {self.project_root}/htmlcov/index.html")
            print(f"📋 XML coverage report: {self.project_root}/coverage.xml")
        else:
            print("❌ Test report generation failed!")

        return exit_code


def main() -> None:
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Test runner for Spark Link plugin",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tests/test_runner.py all                    # Run all tests with coverage
  python tests/test_runner.py unit                   # Run only unit tests
  python tests/test_runner.py integration            # Run only integration tests
  python tests/test_runner.py coverage               # Check test coverage
  python tests/test_runner.py report                 # Generate test report
  python tests/test_runner.py specific --test-path tests/unit/test_main.py
  python tests/test_runner.py all --no-coverage      # Run tests without coverage
  python tests/test_runner.py all --quiet            # Run tests in quiet mode
        """,
    )

    parser.add_argument(
        "command",
        choices=["all", "unit", "integration", "coverage", "report", "specific"],
        help="Test command to run",
    )

    parser.add_argument("--test-path", help="Specific test path for 'specific' command")

    parser.add_argument(
        "--no-coverage",
        action="store_true",
        help="Skip coverage analysis (faster execution)",
    )

    parser.add_argument("--quiet", action="store_true", help="Run tests in quiet mode")

    args = parser.parse_args()

    runner = TestRunner()

    if args.command == "all":
        exit_code = runner.run_all_tests(args.no_coverage, args.quiet)
    elif args.command == "unit":
        exit_code = runner.run_unit_tests(args.quiet)
    elif args.command == "integration":
        exit_code = runner.run_integration_tests(args.quiet)
    elif args.command == "coverage":
        exit_code = runner.check_coverage(args.quiet)
    elif args.command == "report":
        exit_code = runner.generate_report(args.quiet)
    elif args.command == "specific":
        if not args.test_path:
            parser.error("--test-path is required for 'specific' command")
        exit_code = runner.run_specific_test(args.test_path, args.quiet)
    else:
        parser.error(f"Unknown command: {args.command}")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
