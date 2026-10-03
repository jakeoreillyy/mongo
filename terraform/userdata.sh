#!/bin/bash
set -e
exec > /var/log/phalanx-bootstrap.log 2>&1

echo "=== Phalanx bootstrap started at $(date) ==="

# Update system
dnf update -y

# Install Docker, git
dnf install -y docker git

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

# Clone the repo
cd /home/ec2-user
git clone https://github.com/jakeoreillyy/mongo phalanx
chown -R ec2-user:ec2-user phalanx

# Create a deploy helper script
cat > /home/ec2-user/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e
cd /home/ec2-user/phalanx
git pull origin main
docker compose up --build -d
echo "Deploy complete. Check: docker compose logs -f"
DEPLOY
chmod +x /home/ec2-user/deploy.sh
chown ec2-user:ec2-user /home/ec2-user/deploy.sh

echo "=== Bootstrap complete at $(date) ==="
echo "NEXT STEP: SSH in, create phalanx/.env with MONGODB_URI and PORT, then run ./deploy.sh"
echo "Phalanx bootstrap complete" > /home/ec2-user/bootstrap.log
