variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
