import json
from pathlib import Path
from jobhunter.pipeline.verify_and_score import evaluate_job_with_llm

def run_gold_set_test():
    print("=== Running Gold-Set Rubric Scorer Verification ===")
    fixtures_path = Path(__file__).parent / "fixtures.json"
    if not fixtures_path.exists():
        print(f"Error: {fixtures_path} missing.")
        return

    fixtures = json.loads(fixtures_path.read_text(encoding="utf-8"))

    good_fits = [f for f in fixtures if f["type"] == "good_fit"]
    bad_fits = [f for f in fixtures if f["type"] == "bad_fit"]

    passed_good = 0
    passed_bad = 0

    print("\n--- Testing Good-Fit Fixtures (Target > 70) ---")
    for item in good_fits:
        is_legit, score, why, gaps = evaluate_job_with_llm(
            item["title"], item["company"], item["location"], item["description"]
        )
        status = "[PASS]" if score >= 70.0 and is_legit else "[FAIL]"
        if score >= 70.0 and is_legit:
            passed_good += 1
        print(f"[{status}] Score: {score:4.1f} | Legit: {is_legit} | {item['company']:15s} - {item['title']}")

    print("\n--- Testing Bad-Fit Fixtures (Target < 50 or Not Legit) ---")
    for item in bad_fits:
        is_legit, score, why, gaps = evaluate_job_with_llm(
            item["title"], item["company"], item["location"], item["description"]
        )
        status = "[PASS]" if (score < 50.0 or not is_legit) else "[FAIL]"
        if score < 50.0 or not is_legit:
            passed_bad += 1
        print(f"[{status}] Score: {score:4.1f} | Legit: {is_legit} | {item['company']:15s} - {item['title']}")

    print(f"\nGold Set Results: Good Fits Passed ({passed_good}/{len(good_fits)}) | Bad Fits Passed ({passed_bad}/{len(bad_fits)})")
    assert passed_good == len(good_fits), "Some good fits scored below threshold!"
    assert passed_bad == len(bad_fits), "Some bad fits scored above threshold!"
    print("ALL GOLD SET RUBRIC TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_gold_set_test()
