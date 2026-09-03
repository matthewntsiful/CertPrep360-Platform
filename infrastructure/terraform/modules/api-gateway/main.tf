resource "aws_api_gateway_rest_api" "main" {
  name        = var.api_name
  description = "CertPrep360 Serverless API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Phase 4: Request Validator
resource "aws_api_gateway_request_validator" "body_validator" {
  name                        = "body-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = false
}

# Phase 4: JSON Schema model for POST /results
resource "aws_api_gateway_model" "submit_results_model" {
  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "SubmitResultsRequest"
  content_type = "application/json"
  schema       = jsonencode({
    "$schema" = "http://json-schema.org/draft-04/schema#"
    type      = "object"
    required  = ["examId", "certId", "score", "timeTaken"]
    properties = {
      examId    = { type = "string" }
      certId    = { type = "string" }
      score     = { type = "number", minimum = 0, maximum = 100 }
      timeTaken = { type = "number", minimum = 0 }
      answers   = { type = "object" }
    }
  })
}

resource "aws_api_gateway_authorizer" "cognito" {
  name                             = "CognitoAuthorizer"
  type                             = "COGNITO_USER_POOLS"
  rest_api_id                      = aws_api_gateway_rest_api.main.id
  provider_arns                    = [var.cognito_user_pool_arn]
  # TTL=0 disables authorizer result caching. Default 300s was causing
  # stale failed-auth responses to be served for 5 minutes → ERR_TIMED_OUT.
  authorizer_result_ttl_in_seconds = 0
}

# Generic structure for endpoints
# In a real-world scenario, you might loop through a map of routes.
# For simplicity in this refactor, we'll create the core resources.

# /questions
resource "aws_api_gateway_resource" "questions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "questions"
}

# /questions/{certId}
resource "aws_api_gateway_resource" "questions_cert_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.questions.id
  path_part   = "{certId}"
}

# /questions/{certId}/{examId}
resource "aws_api_gateway_resource" "questions_exam_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.questions_cert_id.id
  path_part   = "{examId}"
}

resource "aws_api_gateway_method" "get_questions" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.questions_exam_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.certId" = true
    "method.request.path.examId" = true
  }
}

resource "aws_api_gateway_integration" "questions_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.questions_exam_id.id
  http_method = aws_api_gateway_method.get_questions.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.get_questions_lambda_invoke_arn
}

# /results
resource "aws_api_gateway_resource" "results" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "results"
}

resource "aws_api_gateway_method" "post_results" {
  rest_api_id          = aws_api_gateway_rest_api.main.id
  resource_id          = aws_api_gateway_resource.results.id
  http_method          = "POST"
  authorization        = "COGNITO_USER_POOLS"
  authorizer_id        = aws_api_gateway_authorizer.cognito.id
  request_validator_id = aws_api_gateway_request_validator.body_validator.id
  request_models = {
    "application/json" = aws_api_gateway_model.submit_results_model.name
  }
}

resource "aws_api_gateway_integration" "results_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.results.id
  http_method = aws_api_gateway_method.post_results.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.submit_results_lambda_invoke_arn
}

# /analytics
resource "aws_api_gateway_resource" "analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "analytics"
}

resource "aws_api_gateway_method" "get_analytics" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.analytics.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "analytics_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.get_analytics.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.get_user_analytics_lambda_invoke_arn
}

# /session
resource "aws_api_gateway_resource" "session" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "session"
}

resource "aws_api_gateway_method" "post_session" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.session.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "session_post_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session.id
  http_method = aws_api_gateway_method.post_session.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.manage_session_lambda_invoke_arn
}

resource "aws_api_gateway_resource" "session_cert_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.session.id
  path_part   = "{certId}"
}

resource "aws_api_gateway_resource" "session_exam_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.session_cert_id.id
  path_part   = "{examId}"
}

resource "aws_api_gateway_method" "get_session" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.session_exam_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  request_parameters = {
    "method.request.path.certId" = true
    "method.request.path.examId" = true
  }
}

resource "aws_api_gateway_integration" "session_get_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session_exam_id.id
  http_method = aws_api_gateway_method.get_session.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.manage_session_lambda_invoke_arn
}

# /payment
resource "aws_api_gateway_resource" "payment" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "payment"
}

# /payment/initialize
resource "aws_api_gateway_resource" "payment_initialize" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payment.id
  path_part   = "initialize"
}

resource "aws_api_gateway_method" "post_payment_initialize" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payment_initialize.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "payment_initialize_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payment_initialize.id
  http_method             = aws_api_gateway_method.post_payment_initialize.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.process_payment_lambda_invoke_arn
}

# /payment/verify
resource "aws_api_gateway_resource" "payment_verify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payment.id
  path_part   = "verify"
}

resource "aws_api_gateway_method" "post_payment_verify" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payment_verify.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "payment_verify_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payment_verify.id
  http_method             = aws_api_gateway_method.post_payment_verify.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.process_payment_lambda_invoke_arn
}

# /marketplace
resource "aws_api_gateway_resource" "marketplace" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "marketplace"
}

# /marketplace/register
resource "aws_api_gateway_resource" "marketplace_register" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.marketplace.id
  path_part   = "register"
}

resource "aws_api_gateway_method" "get_marketplace_register" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.marketplace_register.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "marketplace_register_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.marketplace_register.id
  http_method             = aws_api_gateway_method.get_marketplace_register.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.marketplace_register_lambda_invoke_arn
}

# /marketplace/webhook
resource "aws_api_gateway_resource" "marketplace_webhook" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.marketplace.id
  path_part   = "webhook"
}

resource "aws_api_gateway_method" "post_marketplace_webhook" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.marketplace_webhook.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "marketplace_webhook_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.marketplace_webhook.id
  http_method             = aws_api_gateway_method.post_marketplace_webhook.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.marketplace_webhook_lambda_invoke_arn
}

# /dynamic-quiz
resource "aws_api_gateway_resource" "dynamic_quiz" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "dynamic-quiz"
}

resource "aws_api_gateway_method" "get_dynamic_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.dynamic_quiz.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "dynamic_quiz_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dynamic_quiz.id
  http_method = aws_api_gateway_method.get_dynamic_quiz.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.get_dynamic_quiz_lambda_invoke_arn
}

# /catalog (Public)
resource "aws_api_gateway_resource" "catalog" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "catalog"
}

resource "aws_api_gateway_method" "get_catalog" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.catalog.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "catalog_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.catalog.id
  http_method             = aws_api_gateway_method.get_catalog.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.get_catalog_lambda_invoke_arn
}

# CORS Support for /catalog
resource "aws_api_gateway_method" "options_catalog" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.catalog.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_catalog" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.catalog.id
  http_method = aws_api_gateway_method.options_catalog.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_catalog" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.catalog.id
  http_method = aws_api_gateway_method.options_catalog.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods"   = true
    "method.response.header.Access-Control-Allow-Origin"    = true
  }
}

resource "aws_api_gateway_integration_response" "options_catalog" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.catalog.id
  http_method = aws_api_gateway_method.options_catalog.http_method
  status_code = aws_api_gateway_method_response.options_catalog.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods"   = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"    = "'*'"
  }
  depends_on = [aws_api_gateway_integration.options_catalog]
}

# /admin/content
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_content" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "content"
}

resource "aws_api_gateway_method" "post_admin_content" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_content.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "delete_admin_content" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_content.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "get_admin_content" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_content.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_content_get_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_content.id
  http_method             = aws_api_gateway_method.get_admin_content.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.admin_manage_content_lambda_invoke_arn
}

resource "aws_api_gateway_integration" "admin_content_post_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_content.id
  http_method             = aws_api_gateway_method.post_admin_content.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.admin_manage_content_lambda_invoke_arn
}

resource "aws_api_gateway_integration" "admin_content_delete_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_content.id
  http_method             = aws_api_gateway_method.delete_admin_content.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.admin_manage_content_lambda_invoke_arn
}

resource "aws_api_gateway_method" "patch_admin_content" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_content.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_content_patch_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_content.id
  http_method             = aws_api_gateway_method.patch_admin_content.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.admin_manage_content_lambda_invoke_arn
}

# /admin/stats
resource "aws_api_gateway_resource" "admin_stats" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "stats"
}

resource "aws_api_gateway_method" "get_admin_stats" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_stats.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_stats_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_stats.id
  http_method             = aws_api_gateway_method.get_admin_stats.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.admin_analytics_lambda_invoke_arn
}

# /admin/ai
resource "aws_api_gateway_resource" "admin_ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "ai"
}

# /admin/ai/generate
resource "aws_api_gateway_resource" "admin_ai_generate" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_ai.id
  path_part   = "generate"
}

resource "aws_api_gateway_method" "post_admin_ai_generate" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_ai_generate.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_ai_generate_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_ai_generate.id
  http_method             = aws_api_gateway_method.post_admin_ai_generate.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.ai_generate_content_lambda_invoke_arn
}

# CORS Support for /questions/{certId}/{examId}
resource "aws_api_gateway_method" "options_questions" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.questions_exam_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_questions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.questions_exam_id.id
  http_method = aws_api_gateway_method.options_questions.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_questions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.questions_exam_id.id
  http_method = aws_api_gateway_method.options_questions.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_questions" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.questions_exam_id.id
  http_method = aws_api_gateway_method.options_questions.http_method
  status_code = aws_api_gateway_method_response.options_questions.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /results
resource "aws_api_gateway_method" "options_results" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.results.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_results" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.results.id
  http_method = aws_api_gateway_method.options_results.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_results" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.results.id
  http_method = aws_api_gateway_method.options_results.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_results" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.results.id
  http_method = aws_api_gateway_method.options_results.http_method
  status_code = aws_api_gateway_method_response.options_results.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /analytics
resource "aws_api_gateway_method" "options_analytics" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.analytics.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.options_analytics.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.options_analytics.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analytics.id
  http_method = aws_api_gateway_method.options_analytics.http_method
  status_code = aws_api_gateway_method_response.options_analytics.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /dynamic-quiz
resource "aws_api_gateway_method" "options_dynamic_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.dynamic_quiz.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_dynamic_quiz" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dynamic_quiz.id
  http_method = aws_api_gateway_method.options_dynamic_quiz.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_dynamic_quiz" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dynamic_quiz.id
  http_method = aws_api_gateway_method.options_dynamic_quiz.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_dynamic_quiz" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dynamic_quiz.id
  http_method = aws_api_gateway_method.options_dynamic_quiz.http_method
  status_code = aws_api_gateway_method_response.options_dynamic_quiz.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /admin/content
resource "aws_api_gateway_method" "options_admin_content" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_content.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_admin_content" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_content.id
  http_method = aws_api_gateway_method.options_admin_content.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_admin_content" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_content.id
  http_method = aws_api_gateway_method.options_admin_content.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_admin_content" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_content.id
  http_method = aws_api_gateway_method.options_admin_content.http_method
  status_code = aws_api_gateway_method_response.options_admin_content.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /admin/stats
resource "aws_api_gateway_method" "options_admin_stats" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_stats.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_admin_stats" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_stats.id
  http_method = aws_api_gateway_method.options_admin_stats.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_admin_stats" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_stats.id
  http_method = aws_api_gateway_method.options_admin_stats.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_admin_stats" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_stats.id
  http_method = aws_api_gateway_method.options_admin_stats.http_method
  status_code = aws_api_gateway_method_response.options_admin_stats.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /admin/ai/generate
resource "aws_api_gateway_method" "options_admin_ai" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_ai_generate.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_admin_ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_ai_generate.id
  http_method = aws_api_gateway_method.options_admin_ai.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_admin_ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_ai_generate.id
  http_method = aws_api_gateway_method.options_admin_ai.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_admin_ai" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.admin_ai_generate.id
  http_method = aws_api_gateway_method.options_admin_ai.http_method
  status_code = aws_api_gateway_method_response.options_admin_ai.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /session
resource "aws_api_gateway_method" "options_session" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.session.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_session" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session.id
  http_method = aws_api_gateway_method.options_session.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_session" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session.id
  http_method = aws_api_gateway_method.options_session.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_session" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session.id
  http_method = aws_api_gateway_method.options_session.http_method
  status_code = aws_api_gateway_method_response.options_session.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /session/{certId}/{examId}
resource "aws_api_gateway_method" "options_session_exam" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.session_exam_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_session_exam" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session_exam_id.id
  http_method = aws_api_gateway_method.options_session_exam.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_session_exam" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session_exam_id.id
  http_method = aws_api_gateway_method.options_session_exam.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_session_exam" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.session_exam_id.id
  http_method = aws_api_gateway_method.options_session_exam.http_method
  status_code = aws_api_gateway_method_response.options_session_exam.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /payment/initialize
resource "aws_api_gateway_method" "options_payment_initialize" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payment_initialize.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_payment_initialize" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_initialize.id
  http_method = aws_api_gateway_method.options_payment_initialize.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_payment_initialize" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_initialize.id
  http_method = aws_api_gateway_method.options_payment_initialize.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_payment_initialize" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_initialize.id
  http_method = aws_api_gateway_method.options_payment_initialize.http_method
  status_code = aws_api_gateway_method_response.options_payment_initialize.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS Support for /payment/verify
resource "aws_api_gateway_method" "options_payment_verify" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payment_verify.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_payment_verify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_verify.id
  http_method = aws_api_gateway_method.options_payment_verify.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

resource "aws_api_gateway_method_response" "options_payment_verify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_verify.id
  http_method = aws_api_gateway_method.options_payment_verify.http_method
  status_code = "200"
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_payment_verify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.payment_verify.id
  http_method = aws_api_gateway_method.options_payment_verify.http_method
  status_code = aws_api_gateway_method_response.options_payment_verify.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Global Gateway Responses for 4xx/5xx errors (CORS support for error states)
resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT,DELETE,PATCH'"
  }
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.questions_lambda,
    aws_api_gateway_integration.results_lambda,
    aws_api_gateway_integration.analytics_lambda,
    aws_api_gateway_integration.dynamic_quiz_lambda,
    aws_api_gateway_integration.admin_content_post_lambda,
    aws_api_gateway_integration.admin_content_delete_lambda,
    aws_api_gateway_integration.admin_content_patch_lambda,
    aws_api_gateway_integration.admin_content_get_lambda,
    aws_api_gateway_integration.options_catalog,
    aws_api_gateway_integration.catalog_lambda,
    aws_api_gateway_integration.admin_stats_lambda,
    aws_api_gateway_integration.admin_ai_generate_lambda,
    aws_api_gateway_integration.session_post_lambda,
    aws_api_gateway_integration.session_get_lambda,
    aws_api_gateway_integration.payment_initialize_lambda,
    aws_api_gateway_integration.payment_verify_lambda,
    aws_api_gateway_integration.marketplace_register_lambda,
    aws_api_gateway_integration.marketplace_webhook_lambda,
    aws_api_gateway_integration.options_questions,
    aws_api_gateway_integration.options_results,
    aws_api_gateway_integration.options_analytics,
    aws_api_gateway_integration.options_dynamic_quiz,
    aws_api_gateway_integration.options_admin_content,
    aws_api_gateway_integration.options_admin_stats,
    aws_api_gateway_integration.options_admin_ai,
    aws_api_gateway_integration.options_session,
    aws_api_gateway_integration.options_session_exam,
    aws_api_gateway_integration.options_payment_initialize,
    aws_api_gateway_integration.options_payment_verify,
    aws_api_gateway_gateway_response.default_4xx,
    aws_api_gateway_gateway_response.default_5xx
  ]

  # Force a new deployment whenever the API configuration changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.questions.id,
      aws_api_gateway_resource.questions_cert_id.id,
      aws_api_gateway_resource.questions_exam_id.id,
      aws_api_gateway_method.get_questions.id,
      aws_api_gateway_authorizer.cognito.id,
      aws_api_gateway_integration.questions_lambda.id,
      aws_api_gateway_method.options_questions.id,
      aws_api_gateway_method.options_admin_content.id,
      aws_api_gateway_method.options_admin_stats.id,
      aws_api_gateway_method.get_admin_content.id,
      aws_api_gateway_method.post_admin_content.id,
      aws_api_gateway_method.delete_admin_content.id,
      aws_api_gateway_method.get_admin_stats.id,
      aws_api_gateway_integration.admin_content_get_lambda.id,
      aws_api_gateway_integration.admin_content_post_lambda.id,
      aws_api_gateway_integration.admin_content_delete_lambda.id,
      aws_api_gateway_integration.admin_content_patch_lambda.id,
      aws_api_gateway_integration.admin_stats_lambda.id,
      aws_api_gateway_resource.admin_stats.id,
      aws_api_gateway_resource.admin_content.id,
      aws_api_gateway_resource.admin_ai_generate.id,
      aws_api_gateway_integration.admin_ai_generate_lambda.id,
      aws_api_gateway_method.options_admin_ai.id,
      aws_api_gateway_resource.session.id,
      aws_api_gateway_resource.session_cert_id.id,
      aws_api_gateway_resource.session_exam_id.id,
      aws_api_gateway_method.post_session.id,
      aws_api_gateway_method.get_session.id,
      aws_api_gateway_integration.session_post_lambda.id,
      aws_api_gateway_integration.session_get_lambda.id,
      aws_api_gateway_resource.payment.id,
      aws_api_gateway_resource.payment_initialize.id,
      aws_api_gateway_method.post_payment_initialize.id,
      aws_api_gateway_integration.payment_initialize_lambda.id,
      aws_api_gateway_resource.payment_verify.id,
      aws_api_gateway_method.post_payment_verify.id,
      aws_api_gateway_integration.payment_verify_lambda.id,
      aws_api_gateway_method.options_session.id,
      aws_api_gateway_method.options_session_exam.id,
      aws_api_gateway_method.options_payment_initialize.id,
      aws_api_gateway_method.options_payment_verify.id,
      aws_api_gateway_resource.marketplace.id,
      aws_api_gateway_resource.marketplace_register.id,
      aws_api_gateway_resource.marketplace_webhook.id,
      aws_api_gateway_method.get_marketplace_register.id,
      aws_api_gateway_method.post_marketplace_webhook.id,
      aws_api_gateway_integration.marketplace_register_lambda.id,
      aws_api_gateway_integration.marketplace_webhook_lambda.id,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
      aws_api_gateway_resource.catalog.id,
      aws_api_gateway_method.get_catalog.id,
      aws_api_gateway_integration.catalog_lambda.id,
      aws_api_gateway_method.options_catalog.id,
      aws_api_gateway_integration.options_catalog.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  rest_api_id = aws_api_gateway_rest_api.main.id
}

resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "dev"

  # Cache cluster disabled: was causing ERR_TIMED_OUT by routing requests
  # through cache infrastructure even when per-method caching was off.
  cache_cluster_enabled = false
}

# Phase 4: Global Stage-level throttling — 1000 req/s burst, 500 steady rate
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = 1000
    throttling_rate_limit  = 500
  }
}

# Phase 4: Override method-level caching on GET /questions/{certId}/{examId}
resource "aws_api_gateway_method_settings" "questions_cache" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  method_path = "{certId}/{examId}/GET"

  settings {
    metrics_enabled        = true
    caching_enabled        = false
    throttling_burst_limit = 1000
    throttling_rate_limit  = 500
  }
}

# Phase 4: Throttle on /results to prevent exam score flooding
resource "aws_api_gateway_method_settings" "results_throttle" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  method_path = "results/POST"

  settings {
    metrics_enabled        = true
    throttling_burst_limit = 200
    throttling_rate_limit  = 100
  }
}

# --- Custom Domain Implementation ---

resource "aws_api_gateway_domain_name" "custom" {
  count = var.custom_domain_name != "" ? 1 : 0

  regional_certificate_arn = var.certificate_arn
  domain_name              = var.custom_domain_name

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

resource "aws_api_gateway_base_path_mapping" "custom" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  domain_name = aws_api_gateway_domain_name.custom[0].domain_name
}
