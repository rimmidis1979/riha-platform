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
        print(f"Command failed: {cmd}\nStderr: {res.stderr}", file=sys.stderr)
    return res

def run_json(cmd):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return None
    try:
        return json.loads(res.stdout)
    except:
        return None

print("==============================================================================")
print("   RIHA PLATFORM - AUTONOMOUS AWS ECS FARGATE TOPOLOGICAL DEPLOYER")
print("==============================================================================")
print(f"  Cluster     : {CLUSTER}")
print(f"  Region      : {REGION}")
print(f"  Namespace   : {NAMESPACE_ID} (riha.internal)")
print("==============================================================================")

# 1. Map existing Service Discovery services
print("--> Discovering Service Discovery services in riha.internal...")
sd_map = {}
out = run_json(["aws", "servicediscovery", "list-services", "--region", REGION])
if out and "Services" in out:
    for s in out["Services"]:
        sd_map[s["Name"]] = s["Arn"]

def get_or_create_sd(service_name):
    if service_name in sd_map:
        return sd_map[service_name]
    print(f"Creating Service Discovery service for {service_name}...")
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
        return arn
    return None

# Common Spring environment variables
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

# Service Specifications
SERVICES_CONFIG = {
    # Wave 1: Backing Stores
    "riha-postgres-pgvector": {
        "wave": 1,
        "image": "docker.io/rimmidis/riha-platform:riha-postgres-pgvector",
        "port": 5432,
        "cpu": 512,
        "memory": 1024,
        "env": [
            {"name": "POSTGRES_USER", "value": "riha_postgres"},
            {"name": "POSTGRES_PASSWORD", "value": "riha_postgres_secret_2026"},
            {"name": "POSTGRES_DB", "value": "vch_db"}
        ]
    },
    "riha-redis": {
        "wave": 1,
        "image": "docker.io/redis:7-alpine",
        "port": 6379,
        "cpu": 256,
        "memory": 512,
        "env": []
    },
    "riha-kafka": {
        "wave": 1,
        "image": "docker.io/apache/kafka:latest",
        "port": 9092,
        "cpu": 512,
        "memory": 1024,
        "env": [
            {"name": "KAFKA_NODE_ID", "value": "1"},
            {"name": "KAFKA_PROCESS_ROLES", "value": "broker,controller"},
            {"name": "KAFKA_LISTENERS", "value": "PLAINTEXT://:9092,CONTROLLER://:9093"},
            {"name": "KAFKA_ADVERTISED_LISTENERS", "value": "PLAINTEXT://riha-kafka.riha.internal:9092"},
            {"name": "KAFKA_CONTROLLER_LISTENER_NAMES", "value": "CONTROLLER"},
            {"name": "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", "value": "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"},
            {"name": "KAFKA_CONTROLLER_QUORUM_VOTERS", "value": "1@localhost:9093"},
            {"name": "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "value": "1"},
            {"name": "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", "value": "1"},
            {"name": "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", "value": "1"},
            {"name": "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", "value": "0"},
            {"name": "KAFKA_NUM_PARTITIONS", "value": "3"},
            {"name": "KAFKA_AUTO_CREATE_TOPICS_ENABLE", "value": "true"},
            {"name": "CLUSTER_ID", "value": "4L622nShTUiTvyT30rBQcw"}
        ]
    },

    # Wave 2: Agentic Governance & Memory Plane
    "riha-version-control-hub": {
        "wave": 2,
        "image": "docker.io/rimmidis/riha-platform:riha-version-control-hub",
        "port": 8081,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8081"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/vch_db"}
        ]
    },
    "riha-schema-validator": {
        "wave": 2,
        "image": "docker.io/rimmidis/riha-platform:riha-schema-validator",
        "port": 8082,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8082"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_auditor_schema"}
        ]
    },
    "riha-memory-service": {
        "wave": 2,
        "image": "docker.io/rimmidis/riha-platform:riha-memory-service",
        "port": 8086,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8086"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_memory_db"}
        ]
    },
    "riha-eval-monitor": {
        "wave": 2,
        "image": "docker.io/rimmidis/riha-platform:riha-eval-monitor",
        "port": 8087,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8087"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_eval_db"}
        ]
    },

    # Wave 3: Execution, Guardrail & Orchestration Plane
    "riha-mcp-gateway": {
        "wave": 3,
        "image": "docker.io/rimmidis/riha-platform:riha-mcp-gateway",
        "port": 8084,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8084"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_mcp_registry"}
        ]
    },
    "riha-critic-engine": {
        "wave": 3,
        "image": "docker.io/rimmidis/riha-platform:riha-critic-engine",
        "port": 8085,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8085"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_critic_db"}
        ]
    },
    "riha-topology-orchestrator": {
        "wave": 3,
        "image": "docker.io/rimmidis/riha-platform:riha-topology-orchestrator",
        "port": 8083,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8083"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_orchestrator_db"}
        ]
    },

    # Wave 4: Stock AI Product Microservices
    "riha-stock-ai-market-ingestor": {
        "wave": 4,
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-market-ingestor",
        "port": 8091,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8091"}
        ]
    },
    "riha-stock-ai-robinhood-mcp-server": {
        "wave": 4,
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-robinhood-mcp-server",
        "port": 8092,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8092"}
        ]
    },
    "riha-stock-ai-strategy-service": {
        "wave": 4,
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-strategy-service",
        "port": 8093,
        "cpu": 512,
        "memory": 1024,
        "env": COMMON_SPRING_ENV + [
            {"name": "SERVER_PORT", "value": "8093"},
            {"name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/riha_stock_ai_db"}
        ]
    },

    # Wave 5: Frontend Web Applications
    "riha-agentic-ai-hub": {
        "wave": 5,
        "image": "docker.io/rimmidis/riha-platform:riha-agentic-ai-hub",
        "port": 80,
        "cpu": 256,
        "memory": 512,
        "env": []
    },
    "riha-stock-ai-web": {
        "wave": 5,
        "image": "docker.io/rimmidis/riha-platform:riha-stock-ai-web",
        "port": 80,
        "cpu": 256,
        "memory": 512,
        "env": []
    }
}

# 2. Register Task Definitions & Deploy Waves
for wave in [1, 2, 3, 4, 5]:
    wave_services = [s for s, cfg in SERVICES_CONFIG.items() if cfg["wave"] == wave]
    print(f"\n==============================================================================")
    print(f"--> LAUNCHING WAVE {wave}/5: {wave_services}")
    print(f"==============================================================================")
    
    for svc in wave_services:
        cfg = SERVICES_CONFIG[svc]
        sd_arn = get_or_create_sd(svc)
        
        # Register Task Definition
        container_def = {
            "name": svc,
            "image": cfg["image"],
            "cpu": cfg["cpu"],
            "memory": cfg["memory"],
            "essential": True,
            "portMappings": [{"containerPort": cfg["port"], "hostPort": cfg["port"], "protocol": "tcp"}],
            "environment": cfg["env"]
        }
        
        td_file = f"/tmp/{svc}-td.json"
        with open(td_file, "w") as f:
            json.dump([container_def], f)
            
        print(f"Registering Task Definition: {svc}...")
        td_cmd = [
            "aws", "ecs", "register-task-definition",
            "--family", svc,
            "--container-definitions", f"file://{td_file}",
            "--requires-compatibilities", "FARGATE",
            "--network-mode", "awsvpc",
            "--cpu", str(cfg["cpu"]),
            "--memory", str(cfg["memory"]),
            "--region", REGION
        ]
        td_out = run_json(td_cmd)
        if not td_out or "taskDefinition" not in td_out:
            print(f"Failed to register task definition for {svc}", file=sys.stderr)
            continue
        
        td_arn = td_out["taskDefinition"]["taskDefinitionArn"]
        
        # Check if service exists
        svc_desc = run_json(["aws", "ecs", "describe-services", "--cluster", CLUSTER, "--services", svc, "--region", REGION])
        svc_exists = False
        if svc_desc and svc_desc.get("services"):
            if svc_desc["services"][0]["status"] == "ACTIVE":
                svc_exists = True
        
        net_cfg = f"awsvpcConfiguration={{subnets=[{SUBNETS[0]},{SUBNETS[1]}],securityGroups=[{SECURITY_GROUP}],assignPublicIp=ENABLED}}"
        
        if svc_exists:
            print(f"Updating ECS Service {svc} with new task definition...")
            run_cmd([
                "aws", "ecs", "update-service",
                "--cluster", CLUSTER,
                "--service", svc,
                "--task-definition", td_arn,
                "--force-new-deployment",
                "--region", REGION
            ])
        else:
            print(f"Creating ECS Service {svc} (desired-count=1)...")
            svc_cmd = [
                "aws", "ecs", "create-service",
                "--cluster", CLUSTER,
                "--service-name", svc,
                "--task-definition", td_arn,
                "--desired-count", "1",
                "--launch-type", "FARGATE",
                "--network-configuration", net_cfg,
                "--region", REGION
            ]
            if sd_arn:
                svc_cmd.extend(["--service-registries", f"registryArn={sd_arn}"])
            run_cmd(svc_cmd)
            
    print(f"Waiting 25 seconds for Wave {wave} services to initialize tasks...")
    time.sleep(25)

print("\n==============================================================================")
print("SUCCESS: All 5 Waves Provisioned on AWS ECS Fargate!")
print("==============================================================================")
