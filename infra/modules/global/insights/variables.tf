variable "region_name" {
  type        = string
  description = "The cloud region to deploy this resource to"
}

variable "env_name" {
  type        = string
  description = "The environment type (dev, prod, etc.)"
}

variable "rg_name" {
  type        = string
  description = "The name of the resource group to deploy the function app to"
}

variable "service_api" {
  type        = string
  description = "The API for service calls"
}

variable "inference_api" {
  type        = string
  description = "The API for model inference"
}

variable "inference_key" {
  type        = string
  description = "The API key for model inference"
}
