variable "environment" {
  description = "Environment name (e.g. dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for path namespacing"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "paystack_public_key" {
  description = "Paystack Public Key"
  type        = string
  default     = ""
}

variable "paystack_secret_key" {
  description = "Paystack Secret Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "tags" {
  description = "Tags for SSM resources"
  type        = map(string)
  default     = {}
}
