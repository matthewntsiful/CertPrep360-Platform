variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "handler" {
  description = "The function entrypoint in your code"
  type        = string
  default     = "index.handler"
}

variable "zip_path" {
  description = "Path to the lambda zip file"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table to grant access to"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "The execution ARN of the API Gateway"
  type        = string
}

variable "enable_cognito_access" {
  description = "Whether to give Lambda access to Cognito"
  type        = bool
  default     = false
}

variable "enable_bedrock_access" {
  description = "Whether to give Lambda access to AWS Bedrock"
  type        = bool
  default     = false
}

variable "cognito_user_pool_arn" {
  description = "Optional ARN of the Cognito User Pool to grant read access to"
  type        = string
  default     = ""
}

variable "environment_variables" {
  description = "A map of environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "ssm_parameter_arns" {
  description = "List of SSM parameter ARNs the Lambda needs access to"
  type        = list(string)
  default     = []
}

variable "timeout" {
  description = "The amount of time (in seconds) the Lambda function has to run"
  type        = number
  default     = 30
}

variable "memory_size" {
  description = "Amount of memory in MB the Lambda function can use"
  type        = number
  default     = 256
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
