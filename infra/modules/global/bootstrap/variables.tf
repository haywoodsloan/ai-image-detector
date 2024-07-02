variable "env_name" {
  type        = string
  description = "The environment type (dev, prod, etc.)"
}

variable "region_name" {
  type        = string
  description = "The region to put the state storage in"
}
