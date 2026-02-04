import json
import subprocess
import os
from datetime import datetime

REPORT_DIR = "/app/validation_artifacts"
if not os.path.exists(REPORT_DIR):
    os.makedirs(REPORT_DIR)

def run_command(command, section_name, capture_output=True):
    print(f"--- Running: {command} ---")
    try:
        process = subprocess.run(command, shell=True, check=True, capture_output=capture_output, text=True)
        status = "PASS"
        output = process.stdout.strip() if capture_output else ""
        if output:
            print(output)
        error = process.stderr.strip() if capture_output else ""
        message = f"{section_name} completed successfully."
    except subprocess.CalledProcessError as e:
        status = "FAIL"
        output = e.stdout.strip() if capture_output else ""
        if output:
            print(f"STDOUT:\n{output}")
        error = e.stderr.strip() if capture_output else ""
        if error:
            print(f"STDERR:\n{error}")
        message = f"{section_name} failed: {e}"
    except Exception as e:
        status = "FAIL"
        output = ""
        error = str(e)
        message = f"{section_name} encountered an unexpected error: {e}"
        print(f"Unexpected error for {section_name}: {error}")
    
    return {"name": section_name, "status": status, "message": message, "output": output, "error": error}

def parse_shell_script_output(output, section_name):
    results = []
    lines = output.splitlines()
    global_status = "PASS"
    for line in lines:
        if line.startswith("✅"):
            parts = line.split("✅ ")[1].split(": PASS")
            if len(parts) > 1:
                test_name = parts[0].strip()
                msg_parts = line.split("PASS - ")
                message = msg_parts[1].strip() if len(msg_parts) > 1 else "No message"
                results.append({"name": test_name, "status": "PASS", "message": message})
        elif line.startswith("❌"):
            parts = line.split("❌ ")[1].split(": FAIL")
            if len(parts) > 1:
                test_name = parts[0].strip()
                msg_parts = line.split("FAIL - ")
                message = msg_parts[1].strip() if len(msg_parts) > 1 else "No message"
                results.append({"name": test_name, "status": "FAIL", "message": message})
                global_status = "FAIL"
    return {"name": section_name, "status": global_status, "tests": results, "raw_output": output}

def generate_report():
    overall_status = "PASS"
    report_data = {
        "timestamp": datetime.now().isoformat(),
        "overall_status": "PENDING",
        "categories": [],
        "errors": []
    }

    # A) Infrastructure Healthchecks
    healthcheck_result = run_command("/app/scripts/healthchecks.sh", "Infrastructure Healthchecks")
    parsed_healthchecks = parse_shell_script_output(healthcheck_result["output"], "Infrastructure Healthchecks")
    report_data["categories"].append(parsed_healthchecks)
    if parsed_healthchecks["status"] == "FAIL":
        overall_status = "FAIL"
        report_data["errors"].append({"category": "Infrastructure Healthchecks", "message": healthcheck_result["message"], "details": healthcheck_result["error"]})
    
    # C) API Validation
    api_validation_result = run_command("/app/scripts/api_validation.sh", "API Validation")
    parsed_api_validation = parse_shell_script_output(api_validation_result["output"], "API Validation")
    report_data["categories"].append(parsed_api_validation)
    if parsed_api_validation["status"] == "FAIL":
        overall_status = "FAIL"
        report_data["errors"].append({"category": "API Validation", "message": api_validation_result["message"], "details": api_validation_result["error"]})

    # D) Security Validation
    security_validation_result = run_command("/app/scripts/security_validation.sh", "Security Validation")
    parsed_security_validation = parse_shell_script_output(security_validation_result["output"], "Security Validation")
    report_data["categories"].append(parsed_security_validation)
    if parsed_security_validation["status"] == "FAIL":
        overall_status = "FAIL"
        report_data["errors"].append({"category": "Security Validation", "message": security_validation_result["message"], "details": security_validation_result["error"]})

    # B) E2E Functional Validation (Playwright)
    print("Running E2E Functional Validation (Playwright)...")
    # Removed --reporter=json to use config file reporters
    playwright_command = "cd /app/validator/e2e && /app/validator/e2e/node_modules/.bin/playwright test --config=/app/validator/e2e/playwright.config.ts --project=chromium"
    playwright_output_file = os.path.join(REPORT_DIR, "playwright-report.json")
    
    # Run Playwright tests and capture JSON output to a file
    # Adding debug prints to see Playwright's output
    print(f"Executing Playwright command: {playwright_command}")
    # Use pipe to capture output so we can print it if it fails
    playwright_process = subprocess.run(playwright_command, shell=True, capture_output=True, text=True)
    print(f"Playwright Exit Code: {playwright_process.returncode}")
    
    # Do NOT overwrite playwright_output_file here, as Playwright already generated it
    # We save console output to a separate log file for debugging
    playwright_console_log = os.path.join(REPORT_DIR, "playwright-console.log")
    with open(playwright_console_log, "w") as f:
        f.write("STDOUT:\n")
        f.write(playwright_process.stdout)
        f.write("\nSTDERR:\n")
        f.write(playwright_process.stderr)

    if playwright_process.returncode != 0:
        print("❌ Playwright failed! STDOUT:")
        print(playwright_process.stdout)
        print("❌ Playwright failed! STDERR:")
        print(playwright_process.stderr)

    e2e_status = "FAIL" if playwright_process.returncode != 0 else "PASS"
    e2e_details = []

    if os.path.exists(playwright_output_file) and os.path.getsize(playwright_output_file) > 0:
        try:
            with open(playwright_output_file, 'r') as f:
                # Playwright might output non-JSON text before or after JSON if redirected with 2>&1
                # but with --reporter=json it should be clean. 
                # However, if there was a crash, it might not be valid JSON.
                content = f.read()
                # Find the first { and last } to extract JSON if there's noise
                start = content.find('{')
                end = content.rfind('}')
                if start != -1 and end != -1:
                    playwright_results = json.loads(content[start:end+1])
                else:
                    raise ValueError("No valid JSON found in Playwright output.")
            
            total_tests = 0
            failed_tests = 0
            total_duration = 0 
            
            for suite in playwright_results.get("suites", []):
                for spec in suite.get("specs", []):
                    for test_result in spec.get("tests", []):
                        total_tests += 1
                        test_status = "PASS"
                        # Access errors gracefully using .get()
                        test_errors = [error.get("message", "Unknown error") for error in test_result.get("errors", [])]
                        current_test_duration = 0
                        
                        for step in test_result.get("steps", []):
                            current_test_duration += step.get("duration", 0)
                        
                        if test_result.get("status") == "failed":
                            failed_tests += 1
                            test_status = "FAIL"
                            overall_status = "FAIL"
                            if test_errors: # Add only if there are actual errors
                                report_data["errors"].append({
                                    "category": "E2E Functional Validation",
                                    "test_name": spec.get("title"),
                                    "message": "E2E test failed.",
                                    "details": {"errors": test_errors} # Store actual errors
                                })
                        
                        test_duration = test_result.get("duration", current_test_duration)

                        e2e_details.append({
                            "name": spec.get("title"),
                            "status": test_status,
                            "errors": test_errors,
                            "duration_ms": test_duration 
                        })
            e2e_status = "PASS" if failed_tests == 0 else "FAIL"
            report_data["categories"].append({
                "name": "E2E Functional Validation",
                "status": e2e_status,
                "total_tests": total_tests,
                "failed_tests": failed_tests,
                "duration_ms": total_duration, 
                "tests": e2e_details,
                "artifacts_dir": os.path.join(REPORT_DIR, "playwright-report") 
            })
        except Exception as e:
            print(f"Error parsing Playwright JSON: {e}")
            overall_status = "FAIL"
            report_data["errors"].append({"category": "E2E Functional Validation", "message": f"Error parsing Playwright report: {e}"})
            report_data["categories"].append({
                "name": "E2E Functional Validation",
                "status": "FAIL",
                "message": f"Error parsing Playwright report: {e}"
            })
    else:
        overall_status = "FAIL"
        report_data["errors"].append({"category": "E2E Functional Validation", "message": "Playwright JSON report not found or is empty."})
        report_data["categories"].append({
            "name": "E2E Functional Validation",
            "status": "FAIL",
            "message": "Playwright JSON report not found or is empty."
        })
    
    report_data["overall_status"] = overall_status

    # Write JSON report
    json_report_path = os.path.join(REPORT_DIR, "validation_report.json")
    with open(json_report_path, "w") as f:
        json.dump(report_data, f, indent=4)
    print(f"Generated JSON report: {json_report_path}")

    # Generate Markdown report
    md_report_path = os.path.join(REPORT_DIR, "validation_report.md")
    with open(md_report_path, "w") as f:
        f.write(f"# Total Validation Report\n\n")
        f.write(f"**Timestamp:** {report_data['timestamp']}\n")
        f.write(f"**Overall Status:** {'✅ PASS' if report_data['overall_status'] == 'PASS' else '❌ FAIL'}\n\n")
        
        for category in report_data["categories"]:
            f.write(f"## {category['name']} - {'✅ PASS' if category['status'] == 'PASS' else '❌ FAIL'}\n\n")
            if "tests" in category:
                for test in category["tests"]:
                    f.write(f"- {'✅' if test['status'] == 'PASS' else '❌'} {test['name']}: {test['status']}\n")
                    if test["status"] == "FAIL" and test.get("errors"):
                        for error_msg in test["errors"]:
                            f.write(f"  - Error: {error_msg}\n")
                if "total_tests" in category:
                    f.write(f"\n**Metrics:** {category['total_tests']} tests, {category.get('failed_tests', 0)} failed, {category.get('duration_ms', 0) / 1000:.2f}s duration.\n")
                if "artifacts_dir" in category:
                    f.write(f"**Artifacts:** [Playwright HTML Report]({category['artifacts_dir']}/index.html)\n")
            elif "raw_output" in category:
                # For shell scripts, show parsed results if available, else raw output
                if category.get("tests"):
                    for test in category["tests"]:
                        f.write(f"- {'✅' if test['status'] == 'PASS' else '❌'} {test['name']}: {test['message']}\n")
                else:
                    f.write(f"```\n{category['raw_output']}\n```\n")
            f.write("\n")

        if report_data["errors"]:
            f.write("## Detailed Failures and Recommendations\n\n")
            for error in report_data["errors"]:
                f.write(f"### Category: {error['category']}\n")
                if "test_name" in error:
                    f.write(f"**Test:** {error['test_name']}\n")
                f.write(f"**Issue:** {error['message']}\n")
                
                details = error.get("details")
                if details:
                    f.write(f"**Details:**\n```json\n{json.dumps(details, indent=2)}\n```\n")
                
                f.write(f"**Recommended Fix:** Investigate logs for the failing service (e.g., `docker-compose logs <service_name>`) and ensure all dependencies are met and configurations are correct.\n\n")

    print(f"Generated Markdown report: {md_report_path}")

    if report_data["overall_status"] == "FAIL":
        print("Overall Validation Status: FAIL - Not ready for production.")
        exit(1)
    else:
        print("Overall Validation Status: PASS - System is production-ready.")
        exit(0)

if __name__ == "__main__":
    generate_report()