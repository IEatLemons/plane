FROM golang:1.22-alpine AS build

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY . .

RUN go build -o api-go ./cmd/api-go

FROM alpine:3.20

WORKDIR /app

RUN adduser -D -g '' appuser
USER appuser

COPY --from=build /app/api-go /app/api-go

EXPOSE 8001

ENV API_GO_HOST=0.0.0.0
ENV API_GO_PORT=8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8001/health || exit 1

ENTRYPOINT ["/app/api-go"]

