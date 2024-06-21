variable "env_name" {
  type    = string
  default = "dev"
}

variable "hf_key" {
  type        = string
  description = "An access token for Hugging Face"
}
