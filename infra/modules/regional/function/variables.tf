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

variable "db_name" {
  type        = string
  description = "The CosmosDB account name"
}

variable "db_id" {
  type        = string
  description = "The CosmosDB account ID"
}

variable "db_role_id" {
  type        = string
  description = "The CosmosDB role for fetching connection strings"
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

# TODO: restore once frontdoor is back
# variable "frontdoor_guid" {
#   type        = string
#   description = "The ID of the frontdoor for the function"
# }

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

variable "pubsub_hostname" {
  type        = string
  description = "The endpoint of the PubSub service"
}

variable "pubsub_id" {
  type        = string
  description = "The ID of the PubSub service"
}

variable "inference_api" {
  type        = string
  description = "The API for model inference"
}

variable "inference_key" {
  type        = string
  description = "The API key for model inference"
}

variable "inference_reg_id" {
  type        = string
  description = "The API registration ID for model inference"
}


variable "inference_sp_id" {
  type        = string
  description = "The ID of the service prinicipal for the inference service"
}
