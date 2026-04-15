output "google_client_id_arn" {
  value = aws_ssm_parameter.google_client_id.arn
}

output "google_client_secret_arn" {
  value = aws_ssm_parameter.google_client_secret.arn
}

output "paystack_public_key_arn" {
  value = aws_ssm_parameter.paystack_public_key.arn
}

output "paystack_secret_key_arn" {
  value = aws_ssm_parameter.paystack_secret_key.arn
}

output "auth_parameter_arns" {
  value = [
    aws_ssm_parameter.google_client_id.arn,
    aws_ssm_parameter.google_client_secret.arn
  ]
}

output "payment_parameter_arns" {
  value = [
    aws_ssm_parameter.paystack_public_key.arn,
    aws_ssm_parameter.paystack_secret_key.arn
  ]
}
