terraform {
  required_version = ">= 1.9"
  
  backend "s3" {
    bucket         = "saa-exams-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  subdomain     = "aws-exams.${var.root_domain}"
  api_subdomain = "api.${local.subdomain}"
  tags = {
    Environment = "prod"
    Project     = "SAA-C03-Exams"
    ManagedBy   = "Terraform"
  }
}

module "s3" {
  source = "../../modules/s3"
  
  bucket_name                   = local.subdomain
  cloudfront_distribution_arn   = module.cloudfront.distribution_arn
  tags                         = local.tags
}

module "route53" {
  source = "../../modules/route53"
  
  root_domain                = var.root_domain
  subdomain                  = local.subdomain
  api_subdomain              = local.api_subdomain
  cloudfront_domain_name     = module.cloudfront.distribution_domain_name
  cloudfront_hosted_zone_id  = module.cloudfront.distribution_hosted_zone_id
  api_gateway_domain_name    = module.api_gateway.regional_domain_name
  api_gateway_zone_id        = module.api_gateway.regional_zone_id
  create_api_record          = true
  tags                       = local.tags
  
  providers = {
    aws = aws.us_east_1
  }
}

module "cloudfront" {
  source = "../../modules/cloudfront"
  
  s3_bucket_name        = module.s3.bucket_name
  s3_bucket_domain_name = module.s3.bucket_domain_name
  domain_name           = local.subdomain
  ssl_certificate_arn   = module.route53.certificate_arn
  oac_id               = module.s3.oac_id
  logging_bucket       = module.s3.logs_bucket_domain_name
  tags                 = local.tags
  
  providers = {
    aws = aws.us_east_1
  }
}

module "monitoring" {
  source = "../../modules/monitoring"
  
  environment                = "prod"
  cloudfront_distribution_id = module.cloudfront.distribution_id
  tags                      = local.tags
  
  providers = {
    aws = aws.us_east_1
  }
}

module "github_oidc" {
  source = "../../modules/github-oidc"
  
  project_name               = "saa-exams"
  environment                = "prod"
  github_org                 = var.github_org
  github_repo                = var.github_repo
  s3_bucket_arn              = module.s3.bucket_arn
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
  tags                       = local.tags
}

# --- Serverless Backend Integration ---

module "dynamodb" {
  source     = "../../modules/dynamodb"
  table_name = "CertPrep360-Prod-Main"
  tags       = local.tags
}

module "ssm" {
  source               = "../../modules/ssm"
  environment          = "prod"
  project_name         = "certprep360"
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  paystack_public_key  = var.paystack_public_key
  paystack_secret_key  = var.paystack_secret_key
  tags                 = local.tags
}

module "cognito" {
  source         = "../../modules/cognito"
  user_pool_name = "CertPrep360-Prod-Users"
  cognito_domain = "certprep360-prod-auth"
  callback_urls  = ["https://${local.subdomain}"]
  logout_urls    = ["https://${local.subdomain}"]
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  tags           = local.tags
}

module "lambda_get_questions" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-GetQuestions"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/get-questions.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_submit_results" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-SubmitResults"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/submit-results.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_get_user_analytics" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-GetUserAnalytics"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/get-user-analytics.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_get_dynamic_quiz" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-GetDynamicQuiz"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/get-dynamic-quiz.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_admin_manage_content" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-AdminManageContent"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/admin-manage-content.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  cognito_user_pool_arn     = module.cognito.user_pool_arn
  enable_cognito_access     = true
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_admin_analytics" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-AdminAnalytics"
  handler                   = "index.handler"
  zip_path                  = "${path.module}/build/admin-analytics.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  cognito_user_pool_arn     = module.cognito.user_pool_arn
  enable_cognito_access     = true
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
    USER_POOL_ID = module.cognito.user_pool_id
  }
  tags = local.tags
}

module "lambda_get_catalog" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-GetCatalog"
  handler                   = "get-catalog/index.handler"
  zip_path                  = "${path.module}/build/get-catalog.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME     = module.dynamodb.table_name
    ALLOWED_ORIGIN = "https://aws-exams.matthewntsiful.com"
  }
  tags = local.tags
}

module "lambda_ai_generate_content" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-AIGenerateContent"
  handler                   = "ai-generate-content/index.handler"
  zip_path                  = "${path.module}/build/ai-generate-content.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  enable_bedrock_access     = true
  timeout                   = 60
  memory_size               = 512
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_manage_session" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-ManageSession"
  handler                   = "manage-session/index.handler"
  zip_path                  = "${path.module}/build/manage-session.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  environment_variables = {
    TABLE_NAME = module.dynamodb.table_name
  }
  tags = local.tags
}

module "lambda_process_payment" {
  source                    = "../../modules/lambda"
  function_name             = "CertPrep360-Prod-ProcessPayment"
  handler                   = "process-payment/index.handler"
  zip_path                  = "${path.module}/build/process-payment.zip"
  dynamodb_table_arn        = module.dynamodb.table_arn
  api_gateway_execution_arn = module.api_gateway.execution_arn
  ssm_parameter_arns        = module.ssm.payment_parameter_arns
  environment_variables = {
    TABLE_NAME            = module.dynamodb.table_name
    PAYSTACK_SECRET_PARAM = "/certprep360/prod/payments/paystack_secret_key"
  }
  tags = local.tags
}

module "api_gateway" {
  source                               = "../../modules/api-gateway"
  api_name                             = "CertPrep360-Prod-API"
  cognito_user_pool_arn                = module.cognito.user_pool_arn
  get_questions_lambda_invoke_arn      = module.lambda_get_questions.invoke_arn
  submit_results_lambda_invoke_arn     = module.lambda_submit_results.invoke_arn
  get_catalog_lambda_invoke_arn         = module.lambda_get_catalog.invoke_arn
  get_user_analytics_lambda_invoke_arn = module.lambda_get_user_analytics.invoke_arn
  get_dynamic_quiz_lambda_invoke_arn   = module.lambda_get_dynamic_quiz.invoke_arn
  admin_manage_content_lambda_invoke_arn = module.lambda_admin_manage_content.invoke_arn
  admin_analytics_lambda_invoke_arn      = module.lambda_admin_analytics.invoke_arn
  ai_generate_content_lambda_invoke_arn  = module.lambda_ai_generate_content.invoke_arn
  manage_session_lambda_invoke_arn       = module.lambda_manage_session.invoke_arn
  process_payment_lambda_invoke_arn      = module.lambda_process_payment.invoke_arn
  custom_domain_name                   = local.api_subdomain
  certificate_arn                       = module.route53.api_certificate_arn
  tags                                 = local.tags
}

