variable "user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
}

variable "cognito_domain" {
  description = "The domain prefix for the Cognito User Pool"
  type        = string
}

variable "callback_urls" {
  description = "List of allowed callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "google_client_id" {
  description = "The Client ID for the Google OAuth application"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "The Client Secret for the Google OAuth application"
  type        = string
  sensitive   = true
  default     = ""
}
