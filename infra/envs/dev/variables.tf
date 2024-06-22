variable "env_name" {
  type    = string
  default = "dev"
}

variable "region_names" {
  type    = set(string)
  default = ["eastus2"]
}

variable "hf_key" {
  type        = string
  description = "An access token for Hugging Face"
}
