###############################################################################
# Storage Module Outputs
###############################################################################

output "backup_bucket_name" {
  description = "Name of the backup storage bucket"
  value       = google_storage_bucket.backup.name
}

output "backup_bucket_url" {
  description = "URL of the backup storage bucket"
  value       = google_storage_bucket.backup.url
}

output "backup_bucket_self_link" {
  description = "Self-link of the backup storage bucket"
  value       = google_storage_bucket.backup.self_link
}

output "logs_bucket_name" {
  description = "Name of the access logs bucket"
  value       = google_storage_bucket.backup_logs.name
}