variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name for the EC2 key pair"
  type        = string
  default     = "phalanx-key"
}

variable "project_name" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "phalanx"
}

variable "app_port" {
  description = "Port the Express app listens on inside the container"
  type        = number
  default     = 3000
}

variable "github_repo" {
  description = "GitHub repo URL for cloning on the EC2 instance"
  type        = string
  default     = "https://github.com/jakeoreillyy/mongo"
}
