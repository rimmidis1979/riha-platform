variable "aws_region" {
  type        = string
  description = "Target AWS Region"
  default     = "us-east-1"
}

variable "aws_account_id" {
  type        = string
  description = "Target AWS Account ID enforced by SCP"
  default     = "172981085842"
}

variable "environment" {
  type        = string
  description = "Deployment environment name"
  default     = "prod"
}

variable "image_registry_mode" {
  type        = string
  description = "Registry pull mode: DOCKER_IO_PUBLIC (Docker Hub without repositoryCredentials) or AWS_ECR_MIRROR"
  default     = "DOCKER_IO_PUBLIC"

  validation {
    condition     = contains(["DOCKER_IO_PUBLIC", "AWS_ECR_MIRROR"], var.image_registry_mode)
    error_message = "image_registry_mode must be either 'DOCKER_IO_PUBLIC' or 'AWS_ECR_MIRROR'."
  }
}

variable "dockerhub_org" {
  type        = string
  description = "Docker Hub Organization name"
  default     = "rihasoftwaresolutions"
}

variable "image_tag" {
  type        = string
  description = "Container image tag to deploy across all microservices"
  default     = "latest"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Public Subnet CIDRs across multiple AZs for Fargate direct egress"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "service_connect_namespace" {
  type        = string
  description = "ECS Service Connect HTTP namespace name"
  default     = "riha.internal"
}

variable "enable_efs_persistence" {
  type        = bool
  description = "Whether to provision EFS for Postgres pgvector persistent storage"
  default     = true
}

variable "database_password" {
  type        = string
  description = "Postgres master password (stored in SSM Parameter Store in production)"
  default     = "vchub_secret"
  sensitive   = true
}
