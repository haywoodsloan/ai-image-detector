variable "env_name" {
  type        = string
  description = "The environment type (dev, prod, etc.)"
}

variable "rg_name" {
  type        = string
  description = "The name of the resource group for the DB"
}

variable "domain_name" {
  type        = string
  description = "The domain name"
}
