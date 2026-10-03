#!/bin/bash
set -e

# Update system
dnf update -y

# Install Docker, git, Node.js
dnf install -y docker git nodejs

# Start and enable Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Allow ec2-user to run docker without sudo
usermod -aG docker ec2-user

echo "Phalanx bootstrap complete at $(date)" > /home/ec2-user/bootstrap.log
