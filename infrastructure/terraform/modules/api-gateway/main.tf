resource "aws_api_gateway_rest_api" "main" {
  name        = var.api_name
  description = "CertPrep360 Serverless API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
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
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.results.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "results_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.results.id
  http_method = aws_api_gateway_method.post_results.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.submit_results_lambda_invoke_arn
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.questions_lambda,
    aws_api_gateway_integration.results_lambda
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
}

resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "dev"
}
