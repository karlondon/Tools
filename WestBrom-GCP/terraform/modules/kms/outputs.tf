###############################################################################
# KMS Module Outputs
###############################################################################

output "key_ring_id" {
  description = "The ID of the KMS key ring"
  value       = google_kms_key_ring.backup.id
}

output "crypto_key_id" {
  description = "The ID of the KMS crypto key"
  value       = google_kms_crypto_key.backup.id
}

output "crypto_key_name" {
  description = "The full resource name of the KMS crypto key"
  value       = google_kms_crypto_key.backup.id
}