###############################################################################
# Pub/Sub Module Variables
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_prefix" {
  description = "Prefix for resource naming"
  type        = string
}

variable "transfer_service_account_email" {
  description = "Email of the transfer service account (publisher)"
  type        = string
}

variable "notification_email" {
  description = "Email address for alert notifications (optional)"
  type        = string
  default     = ""
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}