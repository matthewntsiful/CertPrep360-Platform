variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "Root domain name"
  type        = string
  default     = "matthewntsiful.com"
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name"
  type        = string
}

variable "google_client_id" {
  description = "Google Client ID for Cognito Federated Login"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google Client Secret for Cognito Federated Login"
  type        = string
  sensitive   = true
  default     = ""
}

variable "paystack_public_key" {
  description = "Paystack Public Key for future payments"
  type        = string
  default     = ""
}

variable "paystack_secret_key" {
  description = "Paystack Secret Key for future payments"
  type        = string
  sensitive   = true
  default     = ""
}