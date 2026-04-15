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

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
