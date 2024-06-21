variable "region_name" {
  type    = string
  default = "eastus2"
}

variable "env_name" {
  type    = string
  description = "The environment type (dev, prod, etc.)"
}

variable "hf_key" {
  type        = string
  description = "An access token for Hugging Face"
}
