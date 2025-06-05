variable "rg_name" {
  type        = string
  description = "The name of the resource group to deploy the function app to"
}

variable "function_hostnames" {
  type        = map(string)
  description = "The hostnames of the regional functions"
}

variable "domain_name" {
  type        = string
  description = "The domain name"
}

variable "api_subdomain" {
  type        = string
  description = "The API subdomain name"
}

variable "env_name" {
  type        = string
  description = "The environment name"
}
