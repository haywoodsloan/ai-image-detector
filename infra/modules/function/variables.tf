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

variable "hf_key" {
  type        = string
  description = "The HuggingFace key to use for the function"
}
