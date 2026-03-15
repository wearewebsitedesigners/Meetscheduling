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
      },
    },
  ],
};
