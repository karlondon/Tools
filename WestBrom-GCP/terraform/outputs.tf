###############################################################################
# Root Module Outputs - WestBrom External Backup GCP
###############################################################################

# KMS
output "kms_key_ring_id" {
  description = "KMS key ring ID"
  value       = module.kms.key_ring_id
}

output "kms_crypto_key_id" {
  description = "KMS crypto key ID used for bucket encryption"
  value       = module.kms.crypto_key_id
}

# Storage
output "backup_bucket_name" {
  description = "Name of the GCS backup bucket"
  value       = module.storage.backup_bucket_name
}

output "backup_bucket_url" {
  description = "URL of the GCS backup bucket"
  value       = module.storage.backup_bucket_url
}

output "logs_bucket_name" {
  description = "Name of the access logs bucket"
  value       = module.storage.logs_bucket_name
}

# Pub/Sub
output "notification_topic_name" {
  description = "Pub/Sub topic for transfer notifications"
  value       = module.pubsub.notification_topic_name
}

output "notification_subscription_id" {
  description = "Pub/Sub subscription for transfer notifications"
  value       = module.pubsub.notification_subscription_id
}

# Transfer
output "transfer_job_name" {
  description = "Name of the Storage Transfer Job"
  value       = module.transfer.transfer_job_name
}

output "sts_service_agent_email" {
  description = "Email of the STS service agent"
  value       = module.transfer.sts_service_agent_email
}

# Service Account
output "transfer_service_account_email" {
  description = "Email of the transfer service account"
  value       = google_service_account.transfer.email
}