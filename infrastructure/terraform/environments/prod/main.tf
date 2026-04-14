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
  subdomain = "aws-exams.${var.root_domain}"
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
  cloudfront_domain_name     = module.cloudfront.distribution_domain_name
  cloudfront_hosted_zone_id  = module.cloudfront.distribution_hosted_zone_id
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
