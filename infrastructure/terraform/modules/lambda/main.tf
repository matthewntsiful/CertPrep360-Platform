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
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem"
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

resource "aws_iam_policy" "bedrock_access" {
  count       = var.enable_bedrock_access ? 1 : 0
  name        = "${var.function_name}-bedrock-access"
  description = "Allow Lambda to invoke Bedrock models"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bedrock" {
  count      = var.enable_bedrock_access ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.bedrock_access[0].arn
}

resource "aws_iam_policy" "s3_read_access" {
  count       = length(var.s3_read_bucket_arns) > 0 ? 1 : 0
  name        = "${var.function_name}-s3-read-access"
  description = "Allow Lambda to read objects from specified S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = flatten([
          for arn in var.s3_read_bucket_arns : [arn, "${arn}/*"]
        ])
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_read" {
  count      = length(var.s3_read_bucket_arns) > 0 ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.s3_read_access[0].arn
}

resource "aws_lambda_function" "main" {
  filename         = var.zip_path
  source_code_hash = filesha256(var.zip_path)
  function_name    = var.function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = var.handler
  runtime          = "nodejs20.x"
  timeout          = var.timeout
  memory_size      = var.memory_size

  environment {
    variables = var.environment_variables
  }

  tags = var.tags
}


resource "aws_iam_policy" "self_invoke" {
  count       = var.enable_self_invoke ? 1 : 0
  name        = "${var.function_name}-self-invoke"
  description = "Allow Lambda to invoke itself asynchronously"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "lambda:InvokeFunction"
        Effect   = "Allow"
        Resource = aws_lambda_function.main.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "self_invoke" {
  count      = var.enable_self_invoke ? 1 : 0
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.self_invoke[0].arn
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.function_name}-Errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "This metric monitors Lambda function errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.function_name}-HighDuration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Average"
  threshold           = 5000 # 5 seconds
  alarm_description   = "This metric monitors Lambda function duration"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = var.tags
}
