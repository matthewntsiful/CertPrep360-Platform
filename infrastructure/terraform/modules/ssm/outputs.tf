output "google_client_id_arn" {
  value = aws_ssm_parameter.google_client_id.arn
}

output "google_client_secret_arn" {
  value = aws_ssm_parameter.google_client_secret.arn
}

output "auth_parameter_arns" {
  value = [
    aws_ssm_parameter.google_client_id.arn,
    aws_ssm_parameter.google_client_secret.arn
  ]
}
