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

variable "db_connection_string" {
  type        = string
  description = "The Mongo DB connection string for the function"
}

variable "db_secondary_connection_string" {
  type        = string
  description = "The secondary Mongo DB connection string for the function"
}

variable "insights_connection_string" {
  type        = string
  description = "The application insights instrumentation connection string"
}

variable "comm_service_connection_string" {
  type        = string
  description = "The communication service connection string"
}

variable "comm_service_secondary_connection_string" {
  type        = string
  description = "The communication service secondary connection string"
}