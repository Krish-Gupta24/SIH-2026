"""Script to execute the complete first engineering vertical slice end-to-end."""

import json
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from simulation.runners.engine import EnergyPlusEngine


def main():
    print("=" * 78)
    print("SIH 2026 Problem Statement 26051 - First Engineering Vertical Slice")
    print("=" * 78)

    # 1. Load Fixed Test Shelter
    test_shelter_path = ROOT_DIR / "simulation" / "test_cases" / "fixed_test_shelter.json"
    with open(test_shelter_path, "r", encoding="utf-8") as f:
        shelter_model = json.load(f)

    print(f"\n1. LOADED FIXED TEST SHELTER:")
    print(f"   - Name: {shelter_model['name']}")
    print(f"   - Dimensions: Length = {shelter_model['geometry']['length']}m, "
          f"Width = {shelter_model['geometry']['width']}m, "
          f"Height = {shelter_model['geometry']['height']}m")
    print(f"   - Region: {shelter_model['location']['region']} (Elevation {shelter_model['location']['elevation']}m)")

    # 2. Weather file
    weather_file = ROOT_DIR / "simulation" / "weather" / "test_weather.epw"
    print(f"\n2. WEATHER DATASET:")
    print(f"   - EPW Path: {weather_file}")

    # 3. Detect and initialize EnergyPlusEngine
    engine = EnergyPlusEngine()
    print(f"\n3. DETECTED ENGINE STATUS:")
    print(f"   - Engine Executable: {engine.runner.executable_path}")
    print(f"   - Detected Version:  {engine.runner.detected_version}")
    print(f"   - Engine State:      {engine.status}")

    # 4. Validate Model
    is_valid, errors = engine.validate_model(shelter_model)
    print(f"\n4. MODEL VALIDATION:")
    print(f"   - Valid: {is_valid}")
    if errors:
        print(f"   - Errors: {errors}")
        sys.exit(1)

    # 5. Prepare Model & Generate IDF
    print(f"\n5. PREPARING MODEL & GENERATING IDF:")
    idf_path = engine.prepare_model(
        shelter_model=shelter_model,
        weather_file_path=str(weather_file),
        run_period_days=3,  # 3-day representative cold period simulation
    )
    print(f"   - Generated IDF: {idf_path}")
    print(f"   - Isolated Work Directory: {engine.work_dir}")

    # 6. Execute Simulation
    print(f"\n6. EXECUTING ENERGYPLUS SIMULATION:")
    results = engine.run_simulation(timeout_seconds=120)

    # 7. Report Outputs
    print("\n" + "=" * 78)
    print("SIMULATION EXECUTION RESULTS & LOG INSPECTION")
    print("=" * 78)
    print(f"Command Executed:     {results.get('command_executed')}")
    print(f"EnergyPlus Version:   {results.get('engine_version')}")
    print(f"Process Exit Code:    {results.get('exit_code')}")
    print(f"Simulation Status:    {results.get('status')}")
    print(f"Execution Duration:   {results.get('duration_seconds')} seconds")

    err_insp = results.get("error_inspection", {})
    print(f"\nError Inspection:")
    print(f"  - Completed Successfully: {err_insp.get('completed_successfully')}")
    print(f"  - Severe Errors:          {err_insp.get('severe_errors')}")
    print(f"  - Warnings Count:         {err_insp.get('warnings')}")
    print(f"  - Engine Summary Line:    {err_insp.get('summary_line')}")

    if results.get("success"):
        thermal = results.get("thermal_performance", {})
        indoor = thermal.get("indoor_temperature", {})
        outdoor = thermal.get("outdoor_temperature", {})
        solar = thermal.get("solar_radiation", {})

        print(f"\nParsed Thermal Outputs:")
        print(f"  - Indoor Temperature Range:  Min = {indoor.get('min_c')} °C, Max = {indoor.get('max_c')} °C, Mean = {indoor.get('mean_c')} °C")
        print(f"  - Outdoor Temperature Range: Min = {outdoor.get('min_c')} °C, Max = {outdoor.get('max_c')} °C, Mean = {outdoor.get('mean_c')} °C")
        print(f"  - Transmitted Solar Gain:    {solar.get('total_window_transmitted_kwh')} kWh (Peak = {solar.get('peak_transmitted_solar_w')} W)")
        print(f"  - Total Timesteps Simulated: {thermal.get('timesteps_simulated')}")

        logs = results.get("logs", {})
        print(f"\nPreserved Artifacts & Logs:")
        print(f"  - Normalized JSON Results:   {Path(engine.work_dir) / 'normalized_results.json'}")
        print(f"  - EnergyPlus Error Log:      {logs.get('err_file')}")
        print(f"  - EnergyPlus CSV Timeseries: {logs.get('csv_file')}")
        print(f"  - Subprocess Stdout Log:     {logs.get('stdout_log')}")
        print(f"  - Subprocess Stderr Log:     {logs.get('stderr_log')}")

        print("\nEngineering Notice:")
        print("  - [IMPORTANT] Model simulation completed successfully, but per rules,")
        print("    the model is NOT YET claimed to be engineering-validated against standard benchmarks.")
        print("=" * 78)
        return 0
    else:
        print("\nSimulation Failed with errors:")
        for err in results.get("errors", []):
            print(f"  - {err}")
        print("=" * 78)
        return 2


if __name__ == "__main__":
    sys.exit(main())
