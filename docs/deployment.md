# Deployment

## VPS or WSL Ubuntu

1. Install Docker and Docker Compose plugin.
2. Clone the repository.
3. Create `.env` from `.env.example`.
4. Set strong values for `DB_PASSWORD` and `MYSQL_ROOT_PASSWORD`.
5. Start the stack:

```bash
docker compose up -d --build
```

6. Check containers:

```bash
docker compose ps
```

7. Check health:

```bash
curl http://localhost:4000/api/health
```

## Production Notes

- Put Nginx, Caddy, or a cloud load balancer in front of port `8080`.
- Restrict public access to MySQL. Do not expose `3307` on the public internet.
- Configure `CORS_ORIGIN` to the production frontend URL.
- Keep `.env` outside Git.

## Redeploy

```bash
git pull
docker compose up -d --build
docker compose ps
```
