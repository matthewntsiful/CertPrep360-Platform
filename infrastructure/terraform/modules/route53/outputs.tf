output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate_validation.exam_cert.certificate_arn
}

output "api_certificate_arn" {
  description = "ARN of the API SSL certificate"
  value       = aws_acm_certificate_validation.api_cert.certificate_arn
}

output "domain_name" {
  description = "Domain name"
  value       = var.subdomain
}

output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}