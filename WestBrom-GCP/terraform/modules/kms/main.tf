###############################################################################
# Cloud KMS Module - Encryption key for backup storage
###############################################################################

resource "google_kms_key_ring" "backup" {
  name     = "${var.project_prefix}-${var.environment}-backup-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "backup" {
  name            = "${var.project_prefix}-${var.environment}-backup-key"
  key_ring        = google_kms_key_ring.backup.id
  rotation_period = var.key_rotation_period
  purpose         = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  labels = var.labels

  lifecycle {
    prevent_destroy = true
  }
}

# Grant the Storage Transfer Service agent access to use the KMS key
resource "google_kms_crypto_key_iam_member" "storage_transfer_encrypt" {
  crypto_key_id = google_kms_crypto_key.backup.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${var.transfer_service_account_email}"
}

# Grant the GCS service agent access to use the KMS key
resource "google_kms_crypto_key_iam_member" "gcs_encrypt" {
  crypto_key_id = google_kms_crypto_key.backup.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${var.project_number}@gs-project-accounts.iam.gserviceaccount.com"
}