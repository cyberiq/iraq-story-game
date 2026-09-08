module.exports = {
  apps: [
    {
      name: 'iraq-story',
      script: 'server.js',
      cwd: '/var/www/iraqstorycard.tech',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
