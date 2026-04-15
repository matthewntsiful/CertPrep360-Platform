variable "root_domain" {
  description = "Root domain name"
  type        = string
}

variable "subdomain" {
  description = "Subdomain name"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  type        = string
}

variable "api_subdomain" {
  description = "The subdomain for the API Gateway"
  type        = string
}

variable "api_gateway_domain_name" {
  description = "The regional domain name for the API Gateway custom domain"
  type        = string
  default     = ""
}

variable "api_gateway_zone_id" {
  description = "The regional hosted zone ID for the API Gateway custom domain"
  type        = string
  default     = ""
}

variable "create_api_record" {
  description = "Whether to create the Route53 record for the API"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}