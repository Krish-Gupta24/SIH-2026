"""CLI command-line script for generating EnergyPlus training datasets for ThermoShelter AI."""

import argparse
from pathlib import Path
import sys

# Ensure repository root is on sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.ai.dataset_generator import DatasetGenerator


def main():
    parser = argparse.ArgumentParser(description="Generate EnergyPlus training dataset for ThermoShelter ML surrogates.")
    parser.add_argument("--stage", type=str, default="stage_a", choices=["stage_a", "stage_b", "stage_c"], help="Dataset stage")
    parser.add_argument("--samples", type=int, default=50, help="Number of valid simulation samples to generate")
    parser.add_argument("--period", type=int, default=3, help="Simulation duration in days (e.g. 3 for winter dev, 365 for annual)")
    parser.add_argument("--month", type=int, default=1, help="Start month (1 for January)")
    parser.add_argument("--day", type=int, default=15, help="Start day (15 for peak winter)")
    parser.add_argument("--workers", type=int, default=4, help="Parallel simulation workers")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for LHS sampling")
    parser.add_argument("--output", type=str, default=None, help="Output parquet filename")

    args = parser.parse_args()

    generator = DatasetGenerator(seed=args.seed)

    def progress(completed, total):
        pct = (completed / total) * 100
        print(f"[{completed}/{total}] ({pct:.1f}%) samples completed", flush=True)

    parquet_path, report_path = generator.generate(
        n_samples=args.samples,
        stage=args.stage,
        period_days=args.period,
        start_month=args.month,
        start_day=args.day,
        workers=args.workers,
        output_filename=args.output,
        progress_callback=progress,
    )

    print(f"\n[SUCCESS] Dataset generated successfully at: {parquet_path}")
    print(f"[SUCCESS] Quality report generated at: {report_path}")


if __name__ == "__main__":
    main()
