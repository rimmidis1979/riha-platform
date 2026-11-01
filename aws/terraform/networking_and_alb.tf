# ==============================================================================
# NETWORKING & APPLICATION LOAD BALANCER INFRASTRUCTURE
# ==============================================================================

data "aws_availability_zones" "available" {
  state = "available"
}

# 1. Dedicated VPC for RIHA Platform
resource "aws_vpc" "riha_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "riha-platform-vpc"
  }
}

resource "aws_internet_gateway" "riha_igw" {
  vpc_id = aws_vpc.riha_vpc.id

  tags = {
    Name = "riha-platform-igw"
  }
}

# 2. Public Subnets across 2 AZs (Fargate tasks run with assign_public_ip=true)
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.riha_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "riha-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.riha_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.riha_igw.id
  }

  tags = {
    Name = "riha-public-route-table"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 3. Security Groups
resource "aws_security_group" "alb" {
  name        = "riha-alb-security-group"
  description = "Controls public inbound traffic to RIHA ALBs"
  vpc_id      = aws_vpc.riha_vpc.id

  # HTTP Web Frontends & Gateways
  ingress {
    description = "HTTP Public Access"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS Public Access"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Agentic AI Hub React UI"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Stock AI Web React UI"
    from_port   = 5174
    to_port     = 5174
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "MCP Gateway REST/SSE API"
    from_port   = 8084
    to_port     = 8084
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Stock AI Strategy Command REST/SSE API"
    from_port   = 8093
    to_port     = 8093
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "riha-alb-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "riha-ecs-tasks-security-group"
  description = "Controls traffic between Fargate containers, Service Connect, and ALB"
  vpc_id      = aws_vpc.riha_vpc.id

  # Allow all traffic originating from ALB
  ingress {
    description     = "Allow inbound from ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow full internal mesh communication for ECS Service Connect
  ingress {
    description = "Internal peer mesh across all RIHA microservices"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Full outbound egress to internet (Yahoo Finance, SEC EDGAR, Robinhood, Docker Hub)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "riha-ecs-tasks-sg"
  }
}

# 4. EFS Persistent Storage for Postgres pgvector
resource "aws_efs_file_system" "postgres_data" {
  count          = var.enable_efs_persistence ? 1 : 0
  creation_token = "riha-postgres-pgvector-data"
  encrypted      = true

  tags = {
    Name = "riha-postgres-pgvector-efs"
  }
}

resource "aws_efs_access_point" "postgres_data" {
  count          = var.enable_efs_persistence ? 1 : 0
  file_system_id = aws_efs_file_system.postgres_data[0].id

  posix_user {
    gid = 999
    uid = 999
  }

  root_directory {
    path = "/pgvector_data"
    creation_info {
      owner_gid   = 999
      owner_uid   = 999
      permissions = "755"
    }
  }

  tags = {
    Name = "riha-postgres-pgvector-access-point"
  }
}

resource "aws_security_group" "efs" {
  count       = var.enable_efs_persistence ? 1 : 0
  name        = "riha-efs-security-group"
  description = "Controls NFS access to Postgres persistent EFS"
  vpc_id      = aws_vpc.riha_vpc.id

  ingress {
    description     = "NFS from ECS Tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "riha-efs-sg"
  }
}

resource "aws_efs_mount_target" "postgres_data" {
  count           = var.enable_efs_persistence ? length(aws_subnet.public) : 0
  file_system_id  = aws_efs_file_system.postgres_data[0].id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs[0].id]
}

# 5. Application Load Balancer
resource "aws_lb" "riha_alb" {
  name               = "riha-platform-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "riha-platform-alb"
  }
}

# Target Groups
resource "aws_lb_target_group" "stock_ai_web" {
  name        = "riha-tg-stock-ai-web"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.riha_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "80"
    protocol            = "HTTP"
    interval            = 20
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200-399"
  }
}

resource "aws_lb_target_group" "agentic_hub" {
  name        = "riha-tg-agentic-hub"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.riha_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "80"
    protocol            = "HTTP"
    interval            = 20
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200-399"
  }
}

resource "aws_lb_target_group" "strategy_service" {
  name        = "riha-tg-strategy-service"
  port        = 8093
  protocol    = "HTTP"
  vpc_id      = aws_vpc.riha_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/actuator/health"
    port                = "8093"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "mcp_gateway" {
  name        = "riha-tg-mcp-gateway"
  port        = 8084
  protocol    = "HTTP"
  vpc_id      = aws_vpc.riha_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/actuator/health"
    port                = "8084"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 6
    healthy_threshold   = 2
    unhealthy_threshold = 5
    matcher             = "200"
  }
}

# ALB Listeners
resource "aws_lb_listener" "http_80" {
  load_balancer_arn = aws_lb.riha_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.stock_ai_web.arn
  }
}

resource "aws_lb_listener" "hub_5173" {
  load_balancer_arn = aws_lb.riha_alb.arn
  port              = 5173
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.agentic_hub.arn
  }
}

resource "aws_lb_listener" "stock_5174" {
  load_balancer_arn = aws_lb.riha_alb.arn
  port              = 5174
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.stock_ai_web.arn
  }
}

resource "aws_lb_listener" "strategy_8093" {
  load_balancer_arn = aws_lb.riha_alb.arn
  port              = 8093
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.strategy_service.arn
  }
}

resource "aws_lb_listener" "mcp_gateway_8084" {
  load_balancer_arn = aws_lb.riha_alb.arn
  port              = 8084
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp_gateway.arn
  }
}
