variable "source_domain" {
  description = "The old domain to redirect from (e.g. aws-exams.matthewntsiful.com)"
  type        = string
}

variable "target_domain" {
  description = "The new domain to redirect to (e.g. certprep360.com)"
  type        = string
}

variable "hosted_zone_domain" {
  description = "The root domain of the Route53 hosted zone (e.g. matthewntsiful.com)"
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
