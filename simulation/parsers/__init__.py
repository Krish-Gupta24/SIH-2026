"""Output parsers for extracting thermal results from simulation output files."""

from typing import Dict, Any, List


class EnergyPlusOutputParser:
    """Parses EnergyPlus output files (.csv, eplusout.sql, eplusout.err)."""

    def parse_error_file(self, err_file_path: str) -> Dict[str, Any]:
        """Extract warnings, severe errors, and fatal errors from EnergyPlus .err file."""
        return {"warnings": [], "severe": [], "fatal": []}

    def parse_hourly_csv(self, csv_file_path: str) -> Dict[str, Any]:
        """Extract hourly zone mean air temperature, surface temperatures, and heating demand."""
        return {}


class OpenStudioResultsParser:
    """Parses OpenStudio standard report outputs."""
    pass


class ANSYSFieldParser:
    """Parses CFD velocity vector and surface heat flux data exported from Fluent."""
    pass
