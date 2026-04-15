###############################################################################
# Backend Configuration - WestBrom External Backup GCP
# Use partial configuration with backend.conf files per environment
###############################################################################

terraform {
  backend "gcs" {
    # Configured via backend.conf files in environments/ directory
    # Example: terraform init -backend-config=environments/nonprod/backend.conf
  }
}