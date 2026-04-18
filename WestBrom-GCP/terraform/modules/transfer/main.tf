###############################################################################
# Storage Transfer Service Module - AWS S3 to GCP Cloud Storage
###############################################################################

# Data source to get the STS service agent email.
# storagetransfer.googleapis.com is enabled by the root module before this module runs.
data "google_storage_transfer_project_service_account" "default" {
  project = var.project_id
}

# Storage Transfer Job - Scheduled pull from AWS S3 to GCS
resource "google_storage_transfer_job" "s3_to_gcs" {
  description = "${var.project_prefix}-${var.environment} Aurora backup transfer from AWS S3 to GCS"
  project     = var.project_id

  transfer_spec {
    # Source: Amazon S3 bucket with IAM Role-based authentication
    aws_s3_data_source {
      bucket_name = var.aws_s3_bucket_name
      role_arn    = var.aws_iam_role_arn
    }

    # Destination: GCP Cloud Storage bucket
    gcs_data_sink {
      bucket_name = var.destination_bucket_name
      path        = "${var.environment}/aurora-backups/"
    }

    # Optional: filter by path prefix within the S3 bucket
    dynamic "object_conditions" {
      for_each = var.aws_s3_path != "" ? [1] : []
      content {
        include_prefixes = [var.aws_s3_path]
      }
    }

    # Transfer options
    transfer_options {
      overwrite_objects_already_existing_in_sink = false
      delete_objects_from_source_after_transfer  = false
      overwrite_when = "DIFFERENT"
    }
  }

  # Schedule configuration
  schedule {
    schedule_start_date {
      year  = var.schedule_start_year
      month = var.schedule_start_month
      day   = var.schedule_start_day
    }

    start_time_of_day {
      hours   = var.transfer_schedule_start_hour
      minutes = var.transfer_schedule_start_minute
      seconds = 0
      nanos   = 0
    }

    repeat_interval = var.transfer_schedule_repeat_interval
  }

  # Notification configuration - publish events on Success, Failed, or Aborted
  notification_config {
    pubsub_topic  = var.notification_topic_id
    event_types   = ["TRANSFER_OPERATION_SUCCESS", "TRANSFER_OPERATION_FAILED", "TRANSFER_OPERATION_ABORTED"]
    payload_format = "JSON"
  }

  # Enable Cloud Logging for monitoring
  logging_config {
    enable_onprem_gcs_transfer_logs = false
    log_actions                      = ["FIND", "COPY"]
    log_action_states                = ["SUCCEEDED", "FAILED"]
  }

}

# Log sink to capture transfer job logs in Cloud Logging
resource "google_logging_project_sink" "transfer_logs" {
  name        = "${var.project_prefix}-${var.environment}-transfer-job-logs"
  project     = var.project_id
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/${var.region}/buckets/_Default"

  filter = <<-EOT
    resource.type="storage_transfer_job"
    resource.labels.project_id="${var.project_id}"
  EOT

  unique_writer_identity = true
}

# Log-based metric for transfer failures (for dashboards/alerts)
resource "google_logging_metric" "transfer_failures" {
  name    = "${var.project_prefix}-${var.environment}-transfer-failures"
  project = var.project_id

  filter = <<-EOT
    resource.type="storage_transfer_job"
    severity>=ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    display_name = "Backup Transfer Failures"
  }
}