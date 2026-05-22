locals {
  name_prefix = replace(var.s3_bucket_name, ".", "-")
}

resource "aws_cloudfront_cache_policy" "exam_cache_policy" {
  name        = "${local.name_prefix}-cache-policy"
  min_ttl     = 0
  default_ttl = 300
  max_ttl     = 86400

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${local.name_prefix}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${local.name_prefix}-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite URLs to append index.html for directory paths"
  publish = true
  code    = file("${path.module}/url-rewrite-function.js")

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_cloudfront_distribution" "exam_distribution" {
  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_id                = "S3-${var.s3_bucket_name}"
    origin_access_control_id = var.oac_id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = var.domain_name != "" ? [var.domain_name] : []

  logging_config {
    bucket = var.logging_bucket
    prefix = "cloudfront-logs/"
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${var.s3_bucket_name}"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = aws_cloudfront_cache_policy.exam_cache_policy.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn           = var.domain_name != "" ? var.ssl_certificate_arn : null
    ssl_support_method            = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version      = "TLSv1.2_2021"
  }

  tags = var.tags
}