###############################################################################
# Pub/Sub Module - Notification topic for transfer job status events
###############################################################################

# Topic for transfer job notifications (Success, Failed, Aborted)
resource "google_pubsub_topic" "transfer_notifications" {
  name    = "${var.project_prefix}-${var.environment}-backup-transfer-notifications"
  project = var.project_id

  labels = var.labels

  message_retention_duration = "86400s" # 24 hours
}

# Subscription for monitoring / alerting integration
resource "google_pubsub_subscription" "transfer_notifications" {
  name    = "${var.project_prefix}-${var.environment}-backup-transfer-notifications-sub"
  topic   = google_pubsub_topic.transfer_notifications.id
  project = var.project_id

  # Messages retained for 7 days if not acknowledged
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" # Never expires
  }

  labels = var.labels
}

# Grant the Storage Transfer Service agent permission to publish to the topic
resource "google_pubsub_topic_iam_member" "transfer_publisher" {
  topic   = google_pubsub_topic.transfer_notifications.id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${var.transfer_service_account_email}"
  project = var.project_id
}

# Optional: Cloud Monitoring alert policy for failed transfers
resource "google_monitoring_alert_policy" "transfer_failure" {
  count        = var.notification_email != "" ? 1 : 0
  display_name = "${var.project_prefix}-${var.environment}-backup-transfer-failure"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Transfer job failure notification"
    condition_matched_log {
      filter = <<-EOT
        resource.type="storage_transfer_job"
        severity>=ERROR
      EOT
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email[0].name
  ]

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }
}

# Optional: Email notification channel for alerts
resource "google_monitoring_notification_channel" "email" {
  count        = var.notification_email != "" ? 1 : 0
  display_name = "${var.project_prefix}-${var.environment}-backup-alert-email"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = var.notification_email
  }
}