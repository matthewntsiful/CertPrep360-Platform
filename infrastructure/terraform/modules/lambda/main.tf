resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "dynamodb_access" {
  name        = "${var.function_name}-dynamodb-access"
  description = "Allow Lambda to access specific DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = [var.dynamodb_table_arn, "${var.dynamodb_table_arn}/index/*"]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.dynamodb_access.arn
}

resource "aws_iam_policy" "ssm_access" {
  count       = length(var.ssm_parameter_arns) > 0 ? 1 : 0
  name        = "${var.function_name}-ssm-access"
  description = "Allow Lambda to read specific SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Effect   = "Allow"
        Resource = var.ssm_parameter_arns
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  count      = length(var.ssm_parameter_arns) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.ssm_access[0].arn
}

resource "aws_iam_policy" "cognito_access" {
  count       = var.enable_cognito_access ? 1 : 0
  name        = "${var.function_name}-cognito-access"
  description = "Allow Lambda to read Cognito user information"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "cognito-idp:ListUsers",
          "cognito-idp:ListGroups",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser"
        ]
        Effect   = "Allow"
        Resource = var.cognito_user_pool_arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cognito" {
  count      = var.enable_cognito_access ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.cognito_access[0].arn
}

resource "aws_lambda_function" "main" {
  filename         = var.zip_path
  source_code_hash = filesha256(var.zip_path)
  function_name    = var.function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = var.handler
  runtime          = "nodejs20.x"

  environment {
    variables = var.environment_variables
  }

  tags = var.tags
}


resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
