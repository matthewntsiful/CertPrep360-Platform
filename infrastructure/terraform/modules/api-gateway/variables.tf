variable "api_name" {
  description = "The name of the REST API"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "The ARN of the Cognito User Pool for authorization"
  type        = string
}

variable "get_questions_lambda_invoke_arn" {
  description = "The invoke ARN of the Lambda function for fetching questions"
  type        = string
}

variable "submit_results_lambda_invoke_arn" {
  description = "The invoke ARN of the Lambda function for submitting results"
  type        = string
}

variable "get_user_analytics_lambda_invoke_arn" {
  description = "The invoke ARN of the Analytics Aggregation Lambda function"
  type        = string
}

variable "get_dynamic_quiz_lambda_invoke_arn" {
  description = "The invoke ARN of the Dynamic Quiz Lambda function"
  type        = string
}

variable "admin_manage_content_lambda_invoke_arn" {
  description = "The invoke ARN of the Admin Content Management Lambda function"
  type        = string
}

variable "admin_analytics_lambda_invoke_arn" {
  description = "Invoke ARN of the admin analytics Lambda"
  type        = string
}

variable "get_catalog_lambda_invoke_arn" {
  description = "Invoke ARN of the Get Catalog Lambda"
  type        = string
}

variable "ai_generate_content_lambda_invoke_arn" {
  description = "Invoke ARN of the AI generate content Lambda"
  type        = string
}

variable "manage_session_lambda_invoke_arn" {
  description = "Invoke ARN of the Manage Session Lambda"
  type        = string
}

variable "process_payment_lambda_invoke_arn" {
  description = "Invoke ARN of the Process Payment Lambda"
  type        = string
}

variable "marketplace_register_lambda_invoke_arn" {
  description = "Invoke ARN of the Marketplace Register Lambda"
  type        = string
}

variable "marketplace_webhook_lambda_invoke_arn" {
  description = "Invoke ARN of the Marketplace Webhook Lambda"
  type        = string
}

variable "custom_domain_name" {
  description = "The custom domain name for the API Gateway (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "The ARN of the ACM certificate for the custom domain (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
