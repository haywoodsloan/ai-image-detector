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

variable "comm_service_endpoint" {
  type        = string
  description = "The communication service endpoint"
}
variable "comm_service_id" {
  type        = string
  description = "The communication service ID"
}

variable "frontdoor_guid" {
  type        = string
  description = "The ID of the frontdoor for the function"
}

variable "api_subdomain" {
  type        = string
  description = "The subdomain for API calls"
}

variable "domain_name" {
  type        = string
  description = "The custom domain for API calls"
}

variable "env_rg_name" {
  type        = string
  description = "The name of the environemnt resource group"
}
