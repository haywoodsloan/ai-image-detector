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