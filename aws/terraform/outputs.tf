output "alb_dns_name" {
  description = "Public DNS Name of the Application Load Balancer"
  value       = aws_lb.riha_alb.dns_name
}

output "stock_ai_web_url" {
  description = "Direct URL for the RIHA Stock AI Executive Command & Decision Monitor UI"
  value       = "http://${aws_lb.riha_alb.dns_name}:5174"
}

output "agentic_hub_web_url" {
  description = "Direct URL for the RIHA Agentic AI Platform Governance Hub"
  value       = "http://${aws_lb.riha_alb.dns_name}:5173"
}

output "stock_ai_strategy_api_url" {
  description = "Direct URL for the Stock AI Strategy REST and SSE live streams"
  value       = "http://${aws_lb.riha_alb.dns_name}:8093"
}

output "mcp_gateway_api_url" {
  description = "Direct URL for the unified MCP Gateway and tool executor"
  value       = "http://${aws_lb.riha_alb.dns_name}:8084"
}

output "service_connect_namespace" {
  description = "Internal ECS Service Connect namespace for inter-service communication"
  value       = var.service_connect_namespace
}

output "ecs_cluster_name" {
  description = "Name of the ECS Cluster"
  value       = aws_ecs_cluster.riha_cluster.name
}

output "image_registry_mode" {
  description = "Image registry pull mode in effect"
  value       = var.image_registry_mode
}
