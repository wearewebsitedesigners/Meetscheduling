module.exports = {
  apps: [
    {
      name: "meetscheduling",
      script: "src/server.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: "512M",
      min_uptime: "10s",
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,
      out_file: "./logs/pm2/out.log",
      error_file: "./logs/pm2/error.log",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 8080,
        HOST: process.env.HOST || "127.0.0.1",
        TRUST_PROXY: process.env.TRUST_PROXY || "1",
        FORCE_HTTPS: process.env.FORCE_HTTPS || "true",
        HSTS_MAX_AGE_SECONDS: process.env.HSTS_MAX_AGE_SECONDS || 31536000,
        DATABASE_PRIVATE_NETWORK_REQUIRED:
          process.env.DATABASE_PRIVATE_NETWORK_REQUIRED || "true",
      },
    },
  ],
};
