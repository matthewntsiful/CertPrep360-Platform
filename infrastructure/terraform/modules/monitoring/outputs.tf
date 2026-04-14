output "cloudfront_4xx_alarm_arn" {
  description = "ARN of CloudFront 4xx error alarm"
  value       = aws_cloudwatch_metric_alarm.cloudfront_4xx_errors.arn
}

output "cloudfront_5xx_alarm_arn" {
  description = "ARN of CloudFront 5xx error alarm"
  value       = aws_cloudwatch_metric_alarm.cloudfront_5xx_errors.arn
}

# output "waf_blocked_alarm_arn" {
#   description = "ARN of WAF blocked requests alarm"
#   value       = aws_cloudwatch_metric_alarm.waf_blocked_requests.arn
# }
