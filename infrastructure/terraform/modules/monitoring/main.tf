resource "aws_cloudwatch_metric_alarm" "cloudfront_4xx_errors" {
  alarm_name          = "${var.environment}-cloudfront-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "CloudFront 4xx error rate exceeds 5%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_errors" {
  alarm_name          = "${var.environment}-cloudfront-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "CloudFront 5xx error rate exceeds 1%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = var.cloudfront_distribution_id
  }

  tags = var.tags
}

# resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
#   alarm_name          = "${var.environment}-waf-blocked-requests"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = 1
#   metric_name         = "BlockedRequests"
#   namespace           = "AWS/WAFV2"
#   period              = 300
#   statistic           = "Sum"
#   threshold           = 100
#   alarm_description   = "WAF blocked more than 100 requests in 5 minutes"
#   treat_missing_data  = "notBreaching"
# 
#   dimensions = {
#     Rule   = "ALL"
#     WebACL = var.waf_web_acl_name
#     Region = "us-east-1"
#   }
# 
#   tags = var.tags
# }
