echo "Deploying Find Your Trek"

git stash
git pull origin main

echo "Building Frontend"
cd frontend
npm run build

<<<<<<< Updated upstream
echo "==> Publishing frontend build to $FRONTEND_WEBROOT"
if [ ! -d "$FRONTEND_WEBROOT" ]; then
  echo "✗ $FRONTEND_WEBROOT does not exist yet. One-time setup (needs sudo):" >&2
  echo "    sudo mkdir -p $FRONTEND_WEBROOT" >&2
  echo "    sudo chown -R \$(whoami):www-data $FRONTEND_WEBROOT" >&2
  echo "    sudo chmod -R 2775 $FRONTEND_WEBROOT" >&2
  exit 1
fi
rsync -a --delete "$REPO_DIR/frontend/dist/" "$FRONTEND_WEBROOT/"
rsync -a --no-o --no-g --delete "$REPO_DIR/frontend/dist/" "$FRONTEND_WEBROOT/"
=======
echo "Copying dist files to the /var/www/findyourtrek"
>>>>>>> Stashed changes

sudo rm -rf /var/www/findyourtrek/*
sudo cp -r dist/* /var/www/findyourtrek/

echo "restarting Nginx"
sudo systemctl restart ngnix

echo "Restarting Pm2"

pm2 restart all --update-env
pm2 status

echo "Deploy complete!"
