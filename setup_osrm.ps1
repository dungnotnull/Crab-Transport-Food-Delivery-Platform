Write-Host "Extracting Ho Chi Minh City bounding box using Osmium (fast, avoids Docker OOM)..."
docker run --rm -v "$($PWD.Path)\osrm\data:/data" stefda/osmium-tool osmium extract -b 106.5,10.5,106.9,10.9 /data/map.osm.pbf -o /data/hcmc.osm.pbf --overwrite

Write-Host "Creating Docker volume for OSRM data on C drive..."
docker volume create crab_osrm_data | Out-Null

Write-Host "Copying HCMC map data to Docker Volume..."
docker run --rm -v "$($PWD.Path)\osrm\data:/src" -v crab_osrm_data:/dest nginx:alpine cp /src/hcmc.osm.pbf /dest/map.osm.pbf

Write-Host "Running osrm-extract (Processing map nodes and edges) in Docker Volume..."
docker run --rm -t -v crab_osrm_data:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf

Write-Host "Running osrm-partition (Partitioning graph)..."
docker run --rm -t -v crab_osrm_data:/data osrm/osrm-backend osrm-partition /data/map.osrm

Write-Host "Running osrm-customize (Customizing edge weights)..."
docker run --rm -t -v crab_osrm_data:/data osrm/osrm-backend osrm-customize /data/map.osrm

Write-Host "Starting osrm-backend service on port 5000..."
docker-compose up -d --force-recreate osrm-backend

Write-Host "🎉 OSRM setup completed successfully!"
