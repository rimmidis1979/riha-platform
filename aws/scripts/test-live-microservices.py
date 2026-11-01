#!/usr/bin/env python3
"""
RIHA Enterprise Platform - AWS ECS Microservices & Web Integration CLI Test Runner
Directly executes automated integration tests against live endpoints.
"""
import urllib.request
import urllib.error
import json
import time
import sys

SERVICES = [
    # Web UIs & Integrations
    {"name": "Web UI: Agentic AI Hub", "url": "http://18.226.200.11/", "type": "html", "expected_code": 200},
    {"name": "Web UI: Stock AI Web", "url": "http://3.21.122.123/", "type": "html", "expected_code": 200},
    {"name": "Integration: Hub -> VCH Goal Contracts", "url": "http://18.226.200.11/api/v1/goal-contracts", "type": "json", "expected_code": 200},
    {"name": "Integration: Stock AI -> Strategies", "url": "http://3.21.122.123/api/v1/stock-ai/strategies", "type": "json", "expected_code": 200},
    {"name": "Integration: Stock AI -> Watchlist", "url": "http://3.21.122.123/api/v1/stock-ai/watchlist", "type": "json", "expected_code": 200},
    
    # Wave 2 Backend Microservices
    {"name": "riha-version-control-hub (:8081)", "url": "http://3.15.19.40:8081/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-version-control-hub (API)", "url": "http://3.15.19.40:8081/api/v1/goal-contracts", "type": "json", "expected_code": 200},
    {"name": "riha-schema-validator (:8082)", "url": "http://3.128.94.216:8082/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-schema-validator (API)", "url": "http://3.128.94.216:8082/api/v1/audits", "type": "json", "expected_code": 200},
    {"name": "riha-memory-service (:8086)", "url": "http://18.117.181.45:8086/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-eval-monitor (:8087)", "url": "http://77.114.71.153:8087/actuator/health", "type": "health", "expected_code": 200},

    # Wave 3 Backend Microservices
    {"name": "riha-mcp-gateway (:8084)", "url": "http://18.222.132.159:8084/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-critic-engine (:8085)", "url": "http://3.147.242.226:8085/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-topology-orchestrator (:8083)", "url": "http://77.113.103.193:8083/actuator/health", "type": "health", "expected_code": 200},

    # Wave 4 Stock AI Microservices
    {"name": "riha-stock-ai-market-ingestor (:8091)", "url": "http://3.129.65.98:8091/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-stock-ai-robinhood-mcp-server (:8092)", "url": "http://77.113.237.98:8092/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-stock-ai-strategy-service (:8093)", "url": "http://13.184.117.46:8093/actuator/health", "type": "health", "expected_code": 200},
    {"name": "riha-stock-ai-strategy-service (API)", "url": "http://13.184.117.46:8093/api/v1/stock-ai/strategies", "type": "json", "expected_code": 200},
]

def run_tests():
    print("=" * 85)
    print("RIHA ENTERPRISE PLATFORM - LIVE AWS ECS MICROSERVICES & INTEGRATION TEST RUNNER")
    print("Region: us-east-2 | AWS Account: 172981085842 | Cluster: riha-agentic-ai-cluster")
    print("=" * 85)

    passed = 0
    failed = 0

    for test in SERVICES:
        start_time = time.time()
        name = test["name"]
        url = test["url"]
        expected_code = test["expected_code"]
        test_type = test["type"]

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "RIHA-Postman-Runner/1.0", "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=5) as response:
                status_code = response.getcode()
                body = response.read().decode("utf-8")
                elapsed_ms = int((time.time() - start_time) * 1000)

                status_ok = (status_code == expected_code)
                detail = f"{status_code} OK ({elapsed_ms}ms)"

                if test_type == "health":
                    try:
                        data = json.loads(body)
                        health_status = data.get("status", "UNKNOWN")
                        detail += f" [Health: {health_status}]"
                        if health_status != "UP":
                            status_ok = False
                    except:
                        pass
                elif test_type == "json":
                    try:
                        data = json.loads(body)
                        if isinstance(data, list):
                            detail += f" [Array count: {len(data)}]"
                        elif isinstance(data, dict):
                            detail += f" [Keys: {len(data.keys())}]"
                    except:
                        pass

                if status_ok:
                    print(f" PASS | {name:<42} | {detail}")
                    passed += 1
                else:
                    print(f" FAIL | {name:<42} | Expected {expected_code}, got {detail}")
                    failed += 1

        except urllib.error.HTTPError as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f" FAIL | {name:<42} | HTTP {e.code} ({elapsed_ms}ms)")
            failed += 1
        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f" ERROR | {name:<42} | Error: {str(e)[:35]} ({elapsed_ms}ms)")
            failed += 1

    print("=" * 85)
    print(f"TEST SUMMARY: {passed} PASSED | {failed} FAILED | TOTAL: {passed + failed}")
    print("=" * 85)

if __name__ == "__main__":
    run_tests()

