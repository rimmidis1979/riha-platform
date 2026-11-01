terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

provider "aws" {
  region = var.aws_region

  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Platform       = "riha-agentic-ai"
      ProductSuite   = "riha-stock-ai"
      Organization   = "RIHA Software Solutions"
      Environment    = var.environment
      ManagedBy      = "Terraform"
      ScpCompliance  = "NoSecretsManager"
    }
  }
}

