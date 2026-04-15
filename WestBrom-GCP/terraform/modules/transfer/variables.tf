###############################################################################
# Transfer Module Variables
###############################################################################

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
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

# AWS Source
variable "aws_s3_bucket_name" {
  description = "Source AWS S3 bucket name"
  type        = string
}

variable "aws_iam_role_arn" {
  description = "AWS IAM Role ARN for cross-cloud authentication"
  type        = string
}

variable "aws_s3_path" {
  description = "Optional path prefix within the S3 bucket"
  type        = string
  default     = ""
}

# GCS Destination
variable "destination_bucket_name" {
  description = "Destination GCS bucket name"
  type        = string
}

# Schedule
variable "schedule_start_year" {
  description = "Year to start the schedule"
  type        = number
  default     = 2026
}

variable "schedule_start_month" {
  description = "Month to start the schedule"
  type        = number
  default     = 4
}

variable "schedule_start_day" {
  description = "Day to start the schedule"
  type        = number
  default     = 30
}

variable "transfer_schedule_start_hour" {
  description = "Hour (UTC) to start the transfer"
  type        = number
  default     = 4
}

variable "transfer_schedule_start_minute" {
  description = "Minute to start the transfer"
  type        = number
  default     = 0
}

variable "transfer_schedule_repeat_interval" {
  description = "Repeat interval (e.g., '86400s' for daily)"
  type        = string
  default     = "86400s"
}

# Notifications
variable "notification_topic_id" {
  description = "Pub/Sub topic ID for transfer notifications"
  type        = string
}