###############################################################################
# Transfer Module Outputs
###############################################################################

output "transfer_job_name" {
  description = "The name of the storage transfer job"
  value       = google_storage_transfer_job.s3_to_gcs.name
}

output "transfer_job_description" {
  description = "The description of the transfer job"
  value       = google_storage_transfer_job.s3_to_gcs.description
}

output "sts_service_agent_email" {
  description = "The email of the Storage Transfer Service agent"
  value       = data.google_storage_transfer_project_service_account.default.email
}

output "transfer_failure_metric_name" {
  description = "Name of the log-based metric for transfer failures"
  value       = google_logging_metric.transfer_failures.name
}