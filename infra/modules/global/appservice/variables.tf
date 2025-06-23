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

variable "insights_connection_string" {
  type        = string
  description = "The application insights instrumentation connection string"
}

variable "model_name" {
  type        = string
  description = "The name of the detector model to use"
}


variable "app_registration_id" {
  type        = string
  description = "The application registration ID for the app service"
}
