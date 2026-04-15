###############################################################################
# Pub/Sub Module Outputs
###############################################################################

output "notification_topic_id" {
  description = "The ID of the notification Pub/Sub topic"
  value       = google_pubsub_topic.transfer_notifications.id
}

output "notification_topic_name" {
  description = "The name of the notification Pub/Sub topic"
  value       = google_pubsub_topic.transfer_notifications.name
}

output "notification_subscription_id" {
  description = "The ID of the notification subscription"
  value       = google_pubsub_subscription.transfer_notifications.id
}