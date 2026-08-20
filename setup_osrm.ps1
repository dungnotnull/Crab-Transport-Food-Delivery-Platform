Write-Host "Creating osrm/data directory..."
New-Item -ItemType Directory -Force -Path "osrm\data" | Out-Null

Write-Host "Downloading Vietnam map (approx ~250MB)... This may take a minute or two."
Invoke-WebRequest -Uri "https://download.geofabrik.de/asia/vietnam-latest.osm.pbf" -OutFile "osrm\data\map.osm.pbf"

Write-Host "Running osrm-extract (Processing map nodes and edges)..."
docker run --rm -t -v "$($PWD.Path)\osrm\data:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf

Write-Host "Running osrm-partition (Partitioning graph)..."
docker run --rm -t -v "$($PWD.Path)\osrm\data:/data" osrm/osrm-backend osrm-partition /data/map.osrm

Write-Host "Running osrm-customize (Customizing edge weights)..."
docker run --rm -t -v "$($PWD.Path)\osrm\data:/data" osrm/osrm-backend osrm-customize /data/map.osrm

Write-Host "Starting osrm-backend service on port 5000..."
docker-compose up -d osrm-backend

Write-Host "🎉 OSRM setup completed successfully!"
