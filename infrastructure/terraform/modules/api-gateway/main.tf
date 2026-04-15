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
  name          = "CognitoAuthorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  provider_arns = [var.cognito_user_pool_arn]
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

resource "aws_api_gateway_method" "get_questions" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.questions.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "questions_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.questions.id
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
  uri                     = var.get_user_analytics_lambda_invoke_arn
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

# Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.questions_lambda,
    aws_api_gateway_integration.results_lambda,
    aws_api_gateway_integration.analytics_lambda,
    aws_api_gateway_integration.dynamic_quiz_lambda,
    aws_api_gateway_integration.admin_content_post_lambda,
    aws_api_gateway_integration.admin_content_delete_lambda
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
}

resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "dev"

  # Phase 4: Stage-level throttling — 1000 req/s burst, 500 steady rate
  default_route_settings {
  }
}

# Phase 4: Override method-level caching on GET /questions
resource "aws_api_gateway_method_settings" "questions_cache" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  method_path = "questions/GET"

  settings {
    metrics_enabled        = true
    caching_enabled        = true
    cache_ttl_in_seconds   = 300
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
