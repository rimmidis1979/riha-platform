# ==============================================================================
# AWS ECS FARGATE CLUSTER, SERVICE CONNECT & MICROSERVICES ORCHESTRATION
# SCP COMPLIANT: Strictly NO Secrets Manager & NO repositoryCredentials
# ==============================================================================

locals {
  image_prefix = var.image_registry_mode == "AWS_ECR_MIRROR" ? "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com" : "docker.io/${var.dockerhub_org}"

  common_spring_env = [
    { name = "SPRING_KAFKA_BOOTSTRAP_SERVERS", value = "riha-kafka.riha.internal:9092" },
    { name = "SPRING_DATA_REDIS_HOST", value = "riha-redis.riha.internal" },
    { name = "SPRING_DATA_REDIS_PORT", value = "6379" },
    { name = "JAVA_TOOL_OPTIONS", value = "-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom" }
  ]
}

# 1. CloudWatch Log Group Prefix
resource "aws_cloudwatch_log_group" "ecs_logs" {
  for_each = toset([
    "riha-postgres-pgvector",
    "riha-redis",
    "riha-kafka",
    "riha-version-control-hub",
    "riha-schema-validator",
    "riha-topology-orchestrator",
    "riha-mcp-gateway",
    "riha-critic-engine",
    "riha-memory-service",
    "riha-eval-monitor",
    "riha-stock-ai-market-ingestor",
    "riha-stock-ai-robinhood-mcp-server",
    "riha-stock-ai-strategy-service",
    "riha-agentic-ai-hub",
    "riha-stock-ai-web"
  ])

  name              = "/ecs/riha/${each.key}"
  retention_in_days = 7

  tags = {
    Service = each.key
  }
}

# 2. Service Connect HTTP Namespace
resource "aws_service_discovery_http_namespace" "riha_internal" {
  name        = var.service_connect_namespace
  description = "ECS Service Connect internal service discovery mesh for RIHA platform"

  tags = {
    Name = var.service_connect_namespace
  }
}

# 3. ECS Cluster
resource "aws_ecs_cluster" "riha_cluster" {
  name = "riha-agentic-ai-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.riha_internal.arn
  }

  tags = {
    Name = "riha-agentic-ai-cluster"
  }
}

# 4. IAM Roles (SCP Compliant: SSM Only, Zero Secrets Manager)
resource "aws_iam_role" "ecs_execution_role" {
  name = "riha-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "ssm_parameter_read" {
  name        = "riha-ssm-parameter-read-policy"
  description = "Allows reading application parameters from SSM Parameter Store (SCP Compliant)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/riha/*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_ssm" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ssm_parameter_read.arn
}

resource "aws_iam_role" "ecs_task_role" {
  name = "riha-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "ecs_task_policy" {
  name        = "riha-ecs-task-runtime-policy"
  description = "Allows Bedrock Converse/Model invocation and EFS access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_policy.arn
}

# ==============================================================================
# STATEFUL BACKING INFRASTRUCTURE SERVICES
# ==============================================================================

# 1. Postgres pgvector
resource "aws_ecs_task_definition" "postgres_pgvector" {
  family                   = "riha-postgres-pgvector"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  volume {
    name = "postgres_storage"
    dynamic "efs_volume_configuration" {
      for_each = var.enable_efs_persistence ? [1] : []
      content {
        file_system_id     = aws_efs_file_system.postgres_data[0].id
        transit_encryption = "ENABLED"
        authorization_config {
          access_point_id = aws_efs_access_point.postgres_data[0].id
          iam             = "ENABLED"
        }
      }
    }
  }

  container_definitions = jsonencode([{
    name      = "riha-postgres-pgvector"
    image     = "pgvector/pgvector:pg16"
    essential = true
    portMappings = [{
      name          = "postgres"
      containerPort = 5432
      hostPort      = 5432
      protocol      = "tcp"
    }]
    environment = [
      { name = "POSTGRES_USER", value = "vchub_user" },
      { name = "POSTGRES_PASSWORD", value = var.database_password },
      { name = "POSTGRES_DB", value = "vch_db" }
    ]
    mountPoints = var.enable_efs_persistence ? [{
      sourceVolume  = "postgres_storage"
      containerPath = "/var/lib/postgresql/data"
      readOnly      = false
    }] : []
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/riha/riha-postgres-pgvector"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "postgres"
      }
    }
  }])
}

resource "aws_ecs_service" "postgres_pgvector" {
  name            = "riha-postgres-pgvector"
  cluster         = aws_ecs_cluster.riha_cluster.id
  task_definition = aws_ecs_task_definition.postgres_pgvector.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.riha_internal.arn
    service {
      discovery_name = "riha-postgres-pgvector"
      port_name      = "postgres"
      client_alias {
        port = 5432
      }
    }
  }
}

# 2. Redis
resource "aws_ecs_task_definition" "redis" {
  family                   = "riha-redis"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "riha-redis"
    image     = "redis:7-alpine"
    essential = true
    portMappings = [{
      name          = "redis"
      containerPort = 6379
      hostPort      = 6379
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/riha/riha-redis"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "redis"
      }
    }
  }])
}

resource "aws_ecs_service" "redis" {
  name            = "riha-redis"
  cluster         = aws_ecs_cluster.riha_cluster.id
  task_definition = aws_ecs_task_definition.redis.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.riha_internal.arn
    service {
      discovery_name = "riha-redis"
      port_name      = "redis"
      client_alias {
        port = 6379
      }
    }
  }
}

# 3. Apache Kafka (KRaft mode)
resource "aws_ecs_task_definition" "kafka" {
  family                   = "riha-kafka"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = "riha-kafka"
    image     = "apache/kafka:3.8.0"
    essential = true
    portMappings = [{
      name          = "kafka"
      containerPort = 9092
      hostPort      = 9092
      protocol      = "tcp"
    }]
    environment = [
      { name = "KAFKA_NODE_ID", value = "1" },
      { name = "KAFKA_PROCESS_ROLES", value = "broker,controller" },
      { name = "KAFKA_LISTENERS", value = "PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093" },
      { name = "KAFKA_ADVERTISED_LISTENERS", value = "PLAINTEXT://riha-kafka.riha.internal:9092" },
      { name = "KAFKA_CONTROLLER_LISTENER_NAMES", value = "CONTROLLER" },
      { name = "KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", value = "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT" },
      { name = "KAFKA_CONTROLLER_QUORUM_VOTERS", value = "1@localhost:9093" },
      { name = "KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", value = "1" },
      { name = "KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", value = "1" },
      { name = "KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", value = "1" },
      { name = "KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", value = "0" },
      { name = "CLUSTER_ID", value = "4L622nShTUiT8YgnQ3ZISA" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/riha/riha-kafka"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "kafka"
      }
    }
  }])
}

resource "aws_ecs_service" "kafka" {
  name            = "riha-kafka"
  cluster         = aws_ecs_cluster.riha_cluster.id
  task_definition = aws_ecs_task_definition.kafka.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.riha_internal.arn
    service {
      discovery_name = "riha-kafka"
      port_name      = "kafka"
      client_alias {
        port = 9092
      }
    }
  }
}

# ==============================================================================
# CORE RIHA AGENTIC AI & STOCK AI APPLICATION SERVICES
# ==============================================================================

locals {
  app_services = {
    # 1. Version Control Hub
    "riha-version-control-hub" = {
      port       = 8081
      cpu        = "512"
      memory     = "1024"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8081" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/vch_db" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
        { name = "VCH_GIT_REPO_PATH", value = "/app/data/local-git-repo" }
      ])
    }

    # 2. Schema Validator
    "riha-schema-validator" = {
      port       = 8082
      cpu        = "512"
      memory     = "1024"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8082" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_auditor_schema" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
        { name = "SOLAR_VCH_URL", value = "http://riha-version-control-hub.riha.internal:8081" }
      ])
    }

    # 3. Topology Orchestrator
    "riha-topology-orchestrator" = {
      port       = 8083
      cpu        = "1024"
      memory     = "2048"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8083" },
        { name = "VCH_BASE_URL", value = "http://riha-version-control-hub.riha.internal:8081" },
        { name = "SCHEMA_VALIDATOR_URL", value = "http://riha-schema-validator.riha.internal:8082" },
        { name = "MCP_GATEWAY_URL", value = "http://riha-mcp-gateway.riha.internal:8084" },
        { name = "CRITIC_ENGINE_URL", value = "http://riha-critic-engine.riha.internal:8085" },
        { name = "MEMORY_SERVICE_URL", value = "http://riha-memory-service.riha.internal:8086" },
        { name = "EVAL_MONITOR_URL", value = "http://riha-eval-monitor.riha.internal:8087" }
      ])
    }

    # 4. MCP Gateway
    "riha-mcp-gateway" = {
      port       = 8084
      cpu        = "1024"
      memory     = "2048"
      alb_target = aws_lb_target_group.mcp_gateway.arn
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8084" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_mcp_registry" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
        { name = "SOLAR_CRITIC_URL", value = "http://riha-critic-engine.riha.internal:8085" }
      ])
    }

    # 5. Critic Engine
    "riha-critic-engine" = {
      port       = 8085
      cpu        = "1024"
      memory     = "2048"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8085" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_critic_db" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
        { name = "SOLAR_VCH_URL", value = "http://riha-version-control-hub.riha.internal:8081" }
      ])
    }

    # 6. Memory Service
    "riha-memory-service" = {
      port       = 8086
      cpu        = "1024"
      memory     = "2048"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8086" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_memory_db" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password }
      ])
    }

    # 7. Eval Monitor
    "riha-eval-monitor" = {
      port       = 8087
      cpu        = "512"
      memory     = "1024"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8087" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_eval_db" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password }
      ])
    }

    # 8. Stock AI Market Ingestor
    "riha-stock-ai-market-ingestor" = {
      port       = 8091
      cpu        = "1024"
      memory     = "2048"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8091" },
        { name = "RIHA_MCP_GATEWAY_URL", value = "http://riha-mcp-gateway.riha.internal:8084" }
      ])
    }

    # 9. Stock AI Robinhood MCP Server
    "riha-stock-ai-robinhood-mcp-server" = {
      port       = 8092
      cpu        = "512"
      memory     = "1024"
      alb_target = null
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8092" },
        { name = "RIHA_MCP_GATEWAY_URL", value = "http://riha-mcp-gateway.riha.internal:8084" }
      ])
    }

    # 10. Stock AI Strategy Service
    "riha-stock-ai-strategy-service" = {
      port       = 8093
      cpu        = "1024"
      memory     = "2048"
      alb_target = aws_lb_target_group.strategy_service.arn
      env = concat(local.common_spring_env, [
        { name = "SERVER_PORT", value = "8093" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/riha_stock_ai_db" },
        { name = "SPRING_DATASOURCE_USERNAME", value = "vchub_user" },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.database_password },
        { name = "RIHA_STOCKAI_VCH_API_URL", value = "http://riha-version-control-hub.riha.internal:8081" },
        { name = "RIHA_STOCKAI_VALIDATOR_API_URL", value = "http://riha-schema-validator.riha.internal:8082" },
        { name = "RIHA_STOCKAI_ORCHESTRATOR_API_URL", value = "http://riha-topology-orchestrator.riha.internal:8083" },
        { name = "RIHA_STOCKAI_MCP_GATEWAY_API_URL", value = "http://riha-mcp-gateway.riha.internal:8084" },
        { name = "RIHA_STOCKAI_CRITIC_API_URL", value = "http://riha-critic-engine.riha.internal:8085" },
        { name = "RIHA_STOCKAI_MEMORY_API_URL", value = "http://riha-memory-service.riha.internal:8086" },
        { name = "RIHA_STOCKAI_EVAL_MONITOR_API_URL", value = "http://riha-eval-monitor.riha.internal:8087" },
        { name = "RIHA_STOCKAI_MARKET_INGESTOR_API_URL", value = "http://riha-stock-ai-market-ingestor.riha.internal:8091" },
        { name = "RIHA_STOCKAI_ROBINHOOD_MCP_API_URL", value = "http://riha-stock-ai-robinhood-mcp-server.riha.internal:8092" }
      ])
    }

    # 11. Agentic AI Hub React Frontend
    "riha-agentic-ai-hub" = {
      port       = 80
      cpu        = "256"
      memory     = "512"
      alb_target = aws_lb_target_group.agentic_hub.arn
      env        = []
    }

    # 12. Stock AI Web React Frontend
    "riha-stock-ai-web" = {
      port       = 80
      cpu        = "256"
      memory     = "512"
      alb_target = aws_lb_target_group.stock_ai_web.arn
      env        = []
    }
  }
}

# Task Definitions for all 12 App Services
resource "aws_ecs_task_definition" "apps" {
  for_each = local.app_services

  family                   = each.key
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name      = each.key
    image     = "${local.image_prefix}/${each.key}:${var.image_tag}"
    essential = true
    portMappings = [{
      name          = "http-${each.value.port}"
      containerPort = each.value.port
      hostPort      = each.value.port
      protocol      = "tcp"
    }]
    environment = each.value.env
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/riha/${each.key}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = each.key
      }
    }
  }])
}

# ECS Services for all 12 App Services
resource "aws_ecs_service" "apps" {
  for_each = local.app_services

  name            = each.key
  cluster         = aws_ecs_cluster.riha_cluster.id
  task_definition = aws_ecs_task_definition.apps[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.riha_internal.arn
    service {
      discovery_name = each.key
      port_name      = "http-${each.value.port}"
      client_alias {
        port = each.value.port
      }
    }
  }

  dynamic "load_balancer" {
    for_each = each.value.alb_target != null ? [1] : []
    content {
      target_group_arn = each.value.alb_target
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  depends_on = [
    aws_ecs_service.postgres_pgvector,
    aws_ecs_service.redis,
    aws_ecs_service.kafka
  ]
}
