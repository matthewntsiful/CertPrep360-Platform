resource "aws_ssm_parameter" "google_client_id" {
  name        = "/${var.project_name}/${var.environment}/auth/google_client_id"
  description = "Google OAuth Client ID for ${var.environment}"
  type        = "SecureString"
  value       = var.google_client_id != "" ? var.google_client_id : "placeholder"
  tags        = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "google_client_secret" {
  name        = "/${var.project_name}/${var.environment}/auth/google_client_secret"
  description = "Google OAuth Client Secret for ${var.environment}"
  type        = "SecureString"
  value       = var.google_client_secret != "" ? var.google_client_secret : "placeholder"
  tags        = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}
