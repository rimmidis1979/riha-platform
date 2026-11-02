#!/usr/bin/env python3
import os
import sys
import json
import time
import subprocess

REGION = os.environ.get("AWS_REGION", "us-east-2")
CLUSTER = os.environ.get("CLUSTER_NAME", "riha-agentic-ai-cluster")
NAMESPACE_ID = "ns-yldsgrx5lwakecpr" # riha.internal
SECURITY_GROUP = "sg-0698e626c5a0e7513" # riha-ecs-tasks-sg
SUBNETS = ["subnet-0c5316973e7cf84c7", "subnet-0324e3970acb7caf2"]

def run_cmd(cmd, check=True):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"Command failed: {' '.join(cmd)}\nStderr: {res.stderr}", file=sys.stderr)
    return res

def run_json(cmd):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"JSON command failed: {' '.join(cmd)}\nStderr: {res.stderr}", file=sys.stderr)
        return None
    try:
        return json.loads(res.stdout)
    except Exception as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
        return None

print("==============================================================================")
print("   RIHA PLATFORM - PROVISIONING MISSING ECS MICROSERVICES")
print("==============================================================================")
print(f"  Cluster     : {CLUSTER}")
print(f"  Region      : {REGION}")
print(f"  Namespace   : {NAMESPACE_ID} (riha.internal)")
print("==============================================================================")

# 1. Discover existing Cloud Map services
print("--> Checking Service Discovery services in riha.internal...")
sd_map = {}
out = run_json(["aws", "servicediscovery", "list-services", "--region", REGION])
if out and "Services" in out:
    for s in out["Services"]:
        sd_map[s["Name"]] = s["Arn"]

def get_or_create_sd(service_name):
    if service_name in sd_map:
        print(f"  Found existing Service Discovery: {service_name} -> {sd_map[service_name]}")
        return sd_map[service_name]
    print(f"  Creating Service Discovery service for {service_name}...")
    cmd = [
        "aws", "servicediscovery", "create-service",
        "--name", service_name,
        "--namespace-id", NAMESPACE_ID,
        "--dns-config", "RoutingPolicy=MULTIVALUE,DnsRecords=[{Type=A,TTL=15}]",
        "--region", REGION
    ]
    res = run_json(cmd)
    if res and "Service" in res:
        arn = res["Service"]["Arn"]
        sd_map[service_name] = arn
        print(f"  Created Service Discovery: {service_name} -> {arn}")
        return arn
    return None

COMMON_SPRING_ENV = [
    {"name": "SPRING_PROFILES_ACTIVE", "value": "aws"},
    {"name": "SPRING_KAFKA_BOOTSTRAP_SERVERS", "value": "riha-kafka.riha.internal:9092"},
    {"name": "SPRING_DATA_REDIS_HOST", "value": "riha-redis.riha.internal"},
    {"name": "SPRING_DATA_REDIS_PORT", "value": "6379"},
    {"name": "SPRING_DATASOURCE_USERNAME", "value": "riha_postgres"},
    {"name": "SPRING_DATASOURCE_PASSWORD", "value": "riha_postgres_secret_2026"},
    {"name": "SPRING_JPA_HIBERNATE_DDL_AUTO", "value": "update"},
    {"name": "SPRING_THREADS_VIRTUAL_ENABLED", "value": "true"},
    {"name": "RIHA_SERVICES_VCH_URL", "value": "http://riha-version-control-hub.riha.internal:8081"},
    {"name": "RIHA_SERVICES_VALIDATOR_URL", "value": "http://riha-schema-validator.riha.internal:8082"},
    {"name": "RIHA_SERVICES_ORCHESTRATOR_URL", "value": "http://riha-topology-orchestrator.riha.internal:8083"},
    {"name": "RIHA_SERVICES_MCP_GATEWAY_URL", "value": "http://riha-mcp-gateway.riha.internal:8084"},
    {"name": "RIHA_SERVICES_CRITIC_URL", "value": "http://riha-critic-engine.riha.internal:8085"},
    {"name": "RIHA_SERVICES_MEMORY_URL", "value": "http://riha-memory-service.riha.internal:8086"},
    {"name": "RIHA_SERVICES_EVAL_URL", "value": "http://riha-eval-monitor.riha.internal:8087"},
    {"name": "RIHA_SERVICES_MARKET_INGESTOR_URL", "value": "http://riha-stock-ai-market-ingestor.riha.internal:8091"},
    {"name": "RIHA_SERVICES_ROBINHOOD_MCP_URL", "value": "http://riha-stock-ai-robinhood-mcp-server.riha.internal:8092"},
    {"name": "RIHA_SERVICES_STOCK_STRATEGY_URL", "value": "http://riha-stock-ai-strategy-service.riha.internal:8093"},
    {"name": "JAVA_TOOL_OPTIONS", "value": "-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"}
]

SERVICES = {
    "riha-stock-ai-portfolio-risk-service": {
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-portfolio-risk-service",
        "port": 8094,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8094"}
        ]
    },
    "riha-stock-ai-sentimental-news-service": {
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-sentimental-news-service",
        "port": 8096,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8096"}
        ]
    },
    "riha-stock-ai-sentiment-news-service": {
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-sentiment-news-service",
        "port": 8096,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8096"}
        ]
    },
    "riha-stock-ai-backtest-engine": {
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-backtest-engine",
        "port": 8095,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8095"}
        ]
    },
    "riha-stock-web": {
        "image": "docker.io/rimmidis/riha-platform:riha-stock-web",
        "port": 80,
        "cpu": 256,
        "memory": 512,
        "env": []
    }
}

for svc_name, cfg in SERVICES.items():
    print(f"\n------------------------------------------------------------------------------")
    print(f"--> Provisioning service: {svc_name}")
    print(f"------------------------------------------------------------------------------")
    sd_arn = get_or_create_sd(svc_name)
    
    container_def = {
        "name": svc_name,
        "image": cfg["image"],
        "cpu": cfg["cpu"],
        "memory": cfg["memory"],
        "essential": True,
        "portMappings": [{"containerPort": cfg["port"], "hostPort": cfg["port"], "protocol": "tcp"}],
        "environment": cfg["env"]
    }
    
    td_file = f"/tmp/{svc_name}-td.json"
    with open(td_file, "w") as f:
        json.dump([container_def], f)
        
    print(f"  Registering Task Definition: {svc_name}...")
    td_cmd = [
        "aws", "ecs", "register-task-definition",
        "--family", svc_name,
        "--container-definitions", f"file://{td_file}",
        "--requires-compatibilities", "FARGATE",
        "--network-mode", "awsvpc",
        "--cpu", str(cfg["cpu"]),
        "--memory", str(cfg["memory"]),
        "--region", REGION
    ]
    td_out = run_json(td_cmd)
    if not td_out or "taskDefinition" not in td_out:
        print(f"[-] Failed to register task definition for {svc_name}", file=sys.stderr)
        continue
    
    td_arn = td_out["taskDefinition"]["taskDefinitionArn"]
    print(f"  Task Definition registered: {td_arn}")
    
    # Check if ECS service exists
    svc_desc = run_json(["aws", "ecs", "describe-services", "--cluster", CLUSTER, "--services", svc_name, "--region", REGION])
    svc_exists = False
    if svc_desc and svc_desc.get("services"):
        for s in svc_desc["services"]:
            if s["serviceName"] == svc_name and s["status"] == "ACTIVE":
                svc_exists = True
                break
                
    net_cfg = f"awsvpcConfiguration={{subnets=[{SUBNETS[0]},{SUBNETS[1]}],securityGroups=[{SECURITY_GROUP}],assignPublicIp=ENABLED}}"
    
    if svc_exists:
        print(f"  Updating existing ECS Service {svc_name}...")
        run_cmd([
            "aws", "ecs", "update-service",
            "--cluster", CLUSTER,
            "--service", svc_name,
            "--task-definition", td_arn,
            "--force-new-deployment",
            "--region", REGION
        ])
    else:
        print(f"  Creating new ECS Service {svc_name} (desired-count=1)...")
        svc_cmd = [
            "aws", "ecs", "create-service",
            "--cluster", CLUSTER,
            "--service-name", svc_name,
            "--task-definition", td_arn,
            "--desired-count", "1",
            "--launch-type", "FARGATE",
            "--network-configuration", net_cfg,
            "--region", REGION
        ]
        if sd_arn:
            svc_cmd.extend(["--service-registries", f"registryArn={sd_arn}"])
        res = run_cmd(svc_cmd)
        if res.returncode == 0:
            print(f"  Successfully created ECS Service {svc_name}!")
        else:
            print(f"  Failed to create ECS Service {svc_name}: {res.stderr}", file=sys.stderr)

print("\n==============================================================================")
print("All requested services provisioned and triggered on AWS ECS!")
print("==============================================================================")

