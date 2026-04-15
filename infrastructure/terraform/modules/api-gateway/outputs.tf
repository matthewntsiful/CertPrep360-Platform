output "api_url" {
  description = "The URL of the API Gateway stage"
  value       = "${aws_api_gateway_stage.dev.invoke_url}/"
}

output "api_id" {
  description = "The ID of the REST API"
  value       = aws_api_gateway_rest_api.main.id
}

output "execution_arn" {
  description = "The execution ARN of the API Gateway"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "regional_domain_name" {
  description = "The regional domain name for the custom domain"
  value       = length(aws_api_gateway_domain_name.custom) > 0 ? aws_api_gateway_domain_name.custom[0].regional_domain_name : ""
}

output "regional_zone_id" {
  description = "The regional hosted zone ID for the custom domain"
  value       = length(aws_api_gateway_domain_name.custom) > 0 ? aws_api_gateway_domain_name.custom[0].regional_zone_id : ""
}
