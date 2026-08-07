"""Test runner script for RPA service comprehensive testing.

This script provides functionality to run all tests with coverage reporting
and generate detailed test reports for the RPA service.
"""

import subprocess
import sys
from pathlib import Path
from typing import List, Optional


class RPATestRunner:
    """Test runner class for RPA service tests."""

    def __init__(self, project_root: Optional[Path] = None):
        """Initialize the test runner.

        Args:
            project_root: Path to the project root directory.
                         If None, will auto-detect from current file location.
        """
        if project_root is None:
            # Auto-detect project root (directory containing this file's parent)
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = project_root

        self.tests_dir = self.project_root / "tests"

    def run_unit_tests(self, coverage: bool = True, verbose: bool = True) -> int:
        """Run all unit tests.

        Args:
            coverage: Whether to generate coverage reports.
            verbose: Whether to run tests in verbose mode.

        Returns:
            Exit code from pytest execution.
        """
        print("🧪 Running unit tests...")

        cmd = [
            sys.executable,
            "-m",
            "pytest",
            str(self.tests_dir / "unit"),
            "-v" if verbose else "",
            "-m",
            "unit",
        ]

        if coverage:
            cmd.extend(
                [
                    "--cov=plugin.rpa",
                    "--cov-report=html:htmlcov",
                    "--cov-report=term-missing",
                    "--cov-report=xml",
                ]
            )

        # Remove empty strings from command
        cmd = [arg for arg in cmd if arg]

        try:
            result = subprocess.run(cmd, cwd=self.project_root)
            return result.returncode
        except subprocess.SubprocessError as e:
            print(f"❌ Error running unit tests: {e}")
            return 1

    def run_integration_tests(self, verbose: bool = True) -> int:
        """Run all integration tests.

        Args:
            verbose: Whether to run tests in verbose mode.

        Returns:
            Exit code from pytest execution.
        """
        print("🔗 Running integration tests...")

        cmd = [
            sys.executable,
            "-m",
            "pytest",
            str(self.tests_dir / "integration"),
            "-v" if verbose else "",
            "-m",
            "integration",
        ]

        # Remove empty strings from command
        cmd = [arg for arg in cmd if arg]

        try:
            result = subprocess.run(cmd, cwd=self.project_root)
            return result.returncode
        except subprocess.SubprocessError as e:
            print(f"❌ Error running integration tests: {e}")
            return 1

    def run_all_tests(self, coverage: bool = True, verbose: bool = True) -> int:
        """Run all tests (unit and integration).

        Args:
            coverage: Whether to generate coverage reports.
            verbose: Whether to run tests in verbose mode.

        Returns:
            Exit code from pytest execution.
        """
        print("🚀 Running all tests...")

        cmd = [
            sys.executable,
            "-m",
            "pytest",
            str(self.tests_dir),
            "-v" if verbose else "",
        ]

        if coverage:
            cmd.extend(
                [
                    "--cov=plugin.rpa",
                    "--cov-report=html:htmlcov",
                    "--cov-report=term-missing",
                    "--cov-report=xml",
                    "--cov-fail-under=90",  # Require at least 90% coverage
                ]
            )

        # Remove empty strings from command
        cmd = [arg for arg in cmd if arg]

        try:
            result = subprocess.run(cmd, cwd=self.project_root)
            return result.returncode
        except subprocess.SubprocessError as e:
            print(f"❌ Error running all tests: {e}")
            return 1

    def run_specific_test(self, test_path: str, verbose: bool = True) -> int:
        """Run a specific test file or test function.

        Args:
            test_path: Path to test file or test function (e.g., 'tests/unit/test_main.py::test_function')
            verbose: Whether to run tests in verbose mode.

        Returns:
            Exit code from pytest execution.
        """
        print(f"🎯 Running specific test: {test_path}")

        cmd = [sys.executable, "-m", "pytest", test_path, "-v" if verbose else ""]

        # Remove empty strings from command
        cmd = [arg for arg in cmd if arg]

        try:
            result = subprocess.run(cmd, cwd=self.project_root)
            return result.returncode
        except subprocess.SubprocessError as e:
            print(f"❌ Error running specific test: {e}")
            return 1

    def check_test_coverage(self) -> bool:
        """Check if test coverage meets requirements.

        Returns:
            True if coverage is adequate, False otherwise.
        """
        print("📊 Checking test coverage...")

        # Run tests with coverage but don't fail on coverage threshold
        cmd = [
            sys.executable,
            "-m",
            "pytest",
            str(self.tests_dir),
            "--cov=plugin.rpa",
            "--cov-report=term-missing",
            "--quiet",
        ]

        try:
            result = subprocess.run(
                cmd, cwd=self.project_root, capture_output=True, text=True
            )

            # Parse coverage from output
            for line in result.stdout.split("\n"):
                if "TOTAL" in line and "%" in line:
                    # Extract percentage
                    parts = line.split()
                    for part in parts:
                        if part.endswith("%"):
                            coverage_pct = int(part.rstrip("%"))
                            print(f"📈 Current test coverage: {coverage_pct}%")
                            return coverage_pct >= 90

            return False
        except subprocess.SubprocessError as e:
            print(f"❌ Error checking coverage: {e}")
            return False

    def list_test_files(self) -> List[Path]:
        """List all test files in the project.

        Returns:
            List of Path objects for all test files.
        """
        test_files = []
        for test_file in self.tests_dir.rglob("test_*.py"):
            test_files.append(test_file.relative_to(self.project_root))
        return sorted(test_files)

    def validate_test_structure(self) -> bool:
        """Validate that test structure is properly organized.

        Returns:
            True if test structure is valid, False otherwise.
        """
        print("🏗️  Validating test structure...")

        required_dirs = [
            self.tests_dir,
            self.tests_dir / "unit",
            self.tests_dir / "integration",
        ]

        required_files = [
            self.tests_dir / "__init__.py",
            self.tests_dir / "conftest.py",
            self.tests_dir / "unit" / "__init__.py",
            self.tests_dir / "integration" / "__init__.py",
        ]

        # Check required directories
        for req_dir in required_dirs:
            if not req_dir.exists():
                print(f"❌ Missing required directory: {req_dir}")
                return False

        # Check required files
        for req_file in required_files:
            if not req_file.exists():
                print(f"❌ Missing required file: {req_file}")
                return False

        # Check that we have test files
        test_files = self.list_test_files()
        if not test_files:
            print("❌ No test files found")
            return False

        print(f"✅ Test structure is valid. Found {len(test_files)} test files.")
        return True

    def generate_test_report(self) -> None:
        """Generate a comprehensive test report."""
        print("📋 Generating test report...")

        print("\n" + "=" * 80)
        print("RPA SERVICE TEST REPORT")
        print("=" * 80)

        # Test structure validation
        structure_valid = self.validate_test_structure()
        print(f"\n📁 Test Structure: {'✅ Valid' if structure_valid else '❌ Invalid'}")

        # List test files
        test_files = self.list_test_files()
        print(f"\n📝 Test Files ({len(test_files)}):")
        for test_file in test_files:
            print(f"   - {test_file}")

        # Test coverage check
        coverage_ok = self.check_test_coverage()
        print(
            f"\n📊 Coverage Status: {'✅ Adequate' if coverage_ok else '❌ Needs Improvement'}"
        )

        print("\n" + "=" * 80)


def main() -> None:
    """Main function for command-line usage."""
    import argparse

    parser = argparse.ArgumentParser(description="RPA Service Test Runner")
    parser.add_argument(
        "command",
        choices=["unit", "integration", "all", "coverage", "report", "specific"],
        help="Test command to run",
    )
    parser.add_argument(
        "--test-path", help="Specific test path (for 'specific' command)"
    )
    parser.add_argument(
        "--no-coverage", action="store_true", help="Skip coverage reporting"
    )
    parser.add_argument("--quiet", action="store_true", help="Run tests in quiet mode")

    args = parser.parse_args()

    runner = RPATestRunner()

    # Ensure we're in the right directory
    if not runner.validate_test_structure():
        print("❌ Invalid test structure. Cannot proceed.")
        sys.exit(1)

    verbose = not args.quiet
    coverage = not args.no_coverage

    if args.command == "unit":
        exit_code = runner.run_unit_tests(coverage=coverage, verbose=verbose)
    elif args.command == "integration":
        exit_code = runner.run_integration_tests(verbose=verbose)
    elif args.command == "all":
        exit_code = runner.run_all_tests(coverage=coverage, verbose=verbose)
    elif args.command == "coverage":
        success = runner.check_test_coverage()
        exit_code = 0 if success else 1
    elif args.command == "report":
        runner.generate_test_report()
        exit_code = 0
    elif args.command == "specific":
        if not args.test_path:
            print("❌ --test-path is required for 'specific' command")
            sys.exit(1)
        exit_code = runner.run_specific_test(args.test_path, verbose=verbose)
    else:
        print(f"❌ Unknown command: {args.command}")
        exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
