variable "region_name" {
  type        = string
  description = "The cloud region to deploy to"
}

variable "env_name" {
  type        = string
  description = "The environment type (dev, prod, etc.)"
}

variable "hf_key" {
  type        = string
  description = "An access token for Hugging Face"
}

variable "db_connection_string" {
  type        = string
  description = "The Mongo DB connection string for the function"
}

variable "db_secondary_connection_string" {
  type        = string
  description = "The Mongo DB connection string for the function"
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