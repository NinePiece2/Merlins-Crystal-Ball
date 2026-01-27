# Dev Setup

To setup the project locally for development it is recomended to use the `docker-compose-dev.yml`. For testing live changes the `merlins-crystal-ball` service can be commented out and the nextjs dev server can be used.

.env.local:

```.env
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/merlins_crystal_ball_dev"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-super-secret-key-change-this-in-production"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=miniopassword
MINIO_BUCKET=character-sheets
```

To run the postgress and minio servers run the command:

`docker compose -f docker-compose-dev.yml up`

To clean up the images:

`docker image prune -af`
