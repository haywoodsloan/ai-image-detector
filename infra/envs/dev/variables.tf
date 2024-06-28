variable "env_name" {
  type    = string
  default = "dev"
}

variable "region_names" {
  type    = list(string)
  default = ["eastus2"]
}

variable "hf_key" {
  type        = string
  sensitive   = true
  description = "An access token for Hugging Face"
}
