###############################################################################
# Cloud Storage Module - Immutable backup bucket with KMS encryption
###############################################################################

resource "google_storage_bucket" "backup" {
  name          = "${var.project_prefix}-${var.environment}-parity-backup-${var.project_id}"
  location      = var.region
  project       = var.project_id
  storage_class = var.storage_class

  # Enable uniform bucket-level access (recommended for security)
  uniform_bucket_level_access = true

  # Encryption with dedicated Cloud KMS key
  encryption {
    default_kms_key_name = var.kms_crypto_key_id
  }

  # Retention policy to prevent deletion of backup objects
  retention_policy {
    is_locked        = var.bucket_lock_enabled
    retention_period = var.retention_period_days * 86400 # Convert days to seconds
  }

  # Lifecycle rule to manage old backups
  lifecycle_rule {
    condition {
      age = var.lifecycle_delete_age_days
    }
    action {
      type = "Delete"
    }
  }

  # Lifecycle rule to transition older backups to cheaper storage
  lifecycle_rule {
    condition {
      age = var.nearline_transition_age_days
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  # Versioning for additional protection
  versioning {
    enabled = true
  }

  # Logging configuration
  logging {
    log_bucket        = google_storage_bucket.backup_logs.id
    log_object_prefix = "backup-access-logs/"
  }

  labels = var.labels

  # Prevent accidental deletion of the backup bucket
  lifecycle {
    prevent_destroy = true
  }
}

# Separate bucket for access logs
resource "google_storage_bucket" "backup_logs" {
  name          = "${var.project_prefix}-${var.environment}-backup-logs-${var.project_id}"
  location      = var.region
  project       = var.project_id
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  labels = merge(var.labels, {
    purpose = "access-logs"
  })
}

# IAM: Grant the transfer service account write access to the backup bucket
resource "google_storage_bucket_iam_member" "transfer_writer" {
  bucket = google_storage_bucket.backup.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.transfer_service_account_email}"
}

# IAM: Grant the transfer service account legacy bucket reader (required for STS)
resource "google_storage_bucket_iam_member" "transfer_legacy_reader" {
  bucket = google_storage_bucket.backup.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${var.transfer_service_account_email}"
}