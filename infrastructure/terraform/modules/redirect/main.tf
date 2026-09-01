terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_route53_zone" "zone" {
  name         = var.hosted_zone_domain
  private_zone = false
}

# ACM cert for the old domain (must be us-east-1 for CloudFront)
resource "aws_acm_certificate" "redirect_cert" {
  domain_name       = var.source_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.redirect_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.zone.zone_id
}

resource "aws_acm_certificate_validation" "redirect_cert" {
  certificate_arn         = aws_acm_certificate.redirect_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# CloudFront Function — 301 redirect to new domain
resource "aws_cloudfront_function" "redirect" {
  name    = replace("redirect-${var.source_domain}", ".", "-")
  runtime = "cloudfront-js-2.0"
  comment = "301 redirect ${var.source_domain} -> ${var.target_domain}"
  publish = true
  code    = <<-EOF
    function handler(event) {
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: {
          location: { value: "https://${var.target_domain}" + event.request.uri }
        }
      };
    }
  EOF
}

# Minimal CloudFront distribution — no origin needed, function handles all requests
resource "aws_cloudfront_distribution" "redirect" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"
  aliases         = [var.source_domain]
  comment         = "Redirect ${var.source_domain} to ${var.target_domain}"

  # CloudFront requires an origin even for function-only distributions
  origin {
    domain_name = "aws.amazon.com"
    origin_id   = "dummy"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "dummy"
    viewer_protocol_policy = "redirect-to-https"
    compress               = false

    # No caching needed — just redirect
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirect.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.redirect_cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = var.tags

  depends_on = [aws_acm_certificate_validation.redirect_cert]
}

# Route53 A record pointing old domain to redirect distribution
resource "aws_route53_record" "redirect" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = var.source_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect.domain_name
    zone_id                = aws_cloudfront_distribution.redirect.hosted_zone_id
    evaluate_target_health = false
  }
}
